package org.forma.wellness;

import android.content.ContentValues;
import android.content.Intent;
import android.content.SharedPreferences;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.net.Uri;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import androidx.browser.customtabs.CustomTabsIntent;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.*;
import java.math.BigInteger;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.security.spec.RSAPublicKeySpec;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.*;
import javax.crypto.*;
import javax.crypto.spec.GCMParameterSpec;
import org.json.JSONArray;
import org.json.JSONObject;

/** Native-only persistence and AI boundary. Secrets never return to JavaScript. */
@CapacitorPlugin(name = "Wellness")
public class WellnessPlugin extends Plugin {

  private final ExecutorService io = Executors.newSingleThreadExecutor();
  private final ExecutorService storageIo = Executors.newSingleThreadExecutor();
  private final ExecutorService authIo = Executors.newSingleThreadExecutor();
  private final AtomicBoolean signingIn = new AtomicBoolean(false);
  private final AtomicInteger generation = new AtomicInteger(0);
  private volatile ServerSocket callbackServer;
  private volatile String lastAuthError = "";
  private static final String ISSUER = "https://auth.openai.com";
  private static final String RESOURCE = "https://api.openai.com/v1";
  private static final String KEY_ALIAS = "forma.credentials.v1";

  private SharedPreferences prefs() {
    return getContext().getSharedPreferences("forma-secrets", 0);
  }

  private SQLiteDatabase db() {
    SQLiteDatabase db = getContext().openOrCreateDatabase("forma.db", 0, null);
    db.execSQL(
      "CREATE TABLE IF NOT EXISTS state (id INTEGER PRIMARY KEY, payload TEXT NOT NULL)"
    );
    return db;
  }

  @PluginMethod
  public void load(PluginCall call) {
    storageIo.execute(() -> {
      try (
        SQLiteDatabase database = db();
        Cursor c = database.rawQuery(
          "SELECT payload FROM state WHERE id=1",
          null
        )
      ) {
        JSObject out = new JSObject();
        if (c.moveToFirst()) out.put("value", c.getString(0));
        call.resolve(out);
      } catch (Exception e) {
        call.reject(
          "Unable to read local database. Existing data was not changed."
        );
      }
    });
  }

  @PluginMethod
  public void save(PluginCall call) {
    String value = call.getString("value", "");
    if (value.length() > 12_000_000) {
      call.reject("Local record limit exceeded. Export your records.");
      return;
    }
    storageIo.execute(() -> {
      try (SQLiteDatabase database = db()) {
        new JSONObject(value);
        ContentValues row = new ContentValues();
        row.put("id", 1);
        row.put("payload", value);
        long result = database.insertWithOnConflict(
          "state",
          null,
          row,
          SQLiteDatabase.CONFLICT_REPLACE
        );
        if (result < 0) throw new IOException();
        call.resolve();
      } catch (Exception e) {
        call.reject("Could not save records to this device.");
      }
    });
  }

  private SecretKey encryptionKey() throws Exception {
    KeyStore store = KeyStore.getInstance("AndroidKeyStore");
    store.load(null);
    if (store.containsAlias(KEY_ALIAS)) return (SecretKey) store.getKey(
      KEY_ALIAS,
      null
    );
    KeyGenerator generator = KeyGenerator.getInstance(
      KeyProperties.KEY_ALGORITHM_AES,
      "AndroidKeyStore"
    );
    generator.init(
      new KeyGenParameterSpec.Builder(
        KEY_ALIAS,
        KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT
      )
        .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
        .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
        .build()
    );
    return generator.generateKey();
  }

  private synchronized void storeSecret(String name, String value)
    throws Exception {
    Cipher c = Cipher.getInstance("AES/GCM/NoPadding");
    c.init(Cipher.ENCRYPT_MODE, encryptionKey());
    String encrypted =
      Base64.encodeToString(c.getIV(), Base64.NO_WRAP) +
      ":" +
      Base64.encodeToString(
        c.doFinal(value.getBytes(StandardCharsets.UTF_8)),
        Base64.NO_WRAP
      );
    if (
      !prefs().edit().putString(name, encrypted).commit()
    ) throw new IOException();
  }

  private synchronized String secret(String name) throws Exception {
    String value = prefs().getString(name, null);
    if (value == null) return null;
    String[] parts = value.split(":");
    Cipher c = Cipher.getInstance("AES/GCM/NoPadding");
    c.init(
      Cipher.DECRYPT_MODE,
      encryptionKey(),
      new GCMParameterSpec(128, Base64.decode(parts[0], Base64.NO_WRAP))
    );
    return new String(
      c.doFinal(Base64.decode(parts[1], Base64.NO_WRAP)),
      StandardCharsets.UTF_8
    );
  }

  @PluginMethod
  public void setKey(PluginCall call) {
    String key = call.getString("key", "").trim();
    if (!key.matches("sk-[A-Za-z0-9_\\-]{12,500}")) {
      call.reject("Enter a valid OpenAI API key starting with sk-.");
      return;
    }
    io.execute(() -> {
      try {
        storeSecret("api-key", key);
        call.resolve();
      } catch (Exception e) {
        call.reject("Could not protect API credentials on this device.");
      }
    });
  }

  @PluginMethod
  public void status(PluginCall call) {
    io.execute(() -> {
      try {
        String raw = secret("oauth");
        JSONObject oauth = raw == null ? new JSONObject() : new JSONObject(raw);
        JSObject out = new JSObject();
        out.put("hasKey", secret("api-key") != null);
        out.put(
          "chatgpt",
          oauth.has("access_token") &&
            oauth.optString("scope").contains("chatgpt.tokens.use.direct")
        );
        out.put("email", oauth.optString("email"));
        out.put("authError", lastAuthError);
        call.resolve(out);
      } catch (Exception e) {
        call.reject(
          "AI credential storage is unavailable. Reconnect your account."
        );
      }
    });
  }

  @PluginMethod
  public void disconnect(PluginCall call) {
    generation.incrementAndGet();
    closeCallback();
    io.execute(() -> {
      if (
        prefs().edit().remove("api-key").remove("oauth").commit()
      ) call.resolve();
      else call.reject("Unable to remove credentials.");
    });
  }

  private void closeCallback() {
    try {
      ServerSocket s = callbackServer;
      if (s != null) s.close();
    } catch (Exception ignored) {}
  }

  @PluginMethod
  public void cancelSignIn(PluginCall call) {
    closeCallback();
    call.resolve();
  }

  private static String random() {
    byte[] bytes = new byte[32];
    new SecureRandom().nextBytes(bytes);
    return Base64.encodeToString(
      bytes,
      Base64.URL_SAFE | Base64.NO_WRAP | Base64.NO_PADDING
    );
  }

  private static String form(Map<String, String> values) {
    StringBuilder out = new StringBuilder();
    for (Map.Entry<String, String> e : values.entrySet()) {
      if (out.length() > 0) out.append('&');
      out
        .append(Uri.encode(e.getKey()))
        .append('=')
        .append(Uri.encode(e.getValue()));
    }
    return out.toString();
  }

  private static Map<String, String> values(String... items) {
    Map<String, String> out = new LinkedHashMap<>();
    for (int i = 0; i < items.length; i += 2) out.put(items[i], items[i + 1]);
    return out;
  }

  private HttpURLConnection connect(String url, String method, String bearer)
    throws Exception {
    URL target = new URL(url);
    if (
      !target.getProtocol().equals("https") ||
      !(
        target.getHost().equals("auth.openai.com") ||
        target.getHost().equals("api.openai.com")
      )
    ) throw new IOException("Untrusted provider URL");
    HttpURLConnection c = (HttpURLConnection) target.openConnection();
    c.setConnectTimeout(20000);
    c.setReadTimeout(90000);
    c.setInstanceFollowRedirects(false);
    c.setRequestMethod(method);
    c.setRequestProperty("Accept", "application/json");
    if (bearer != null) c.setRequestProperty(
      "Authorization",
      "Bearer " + bearer
    );
    return c;
  }

  private JSONObject jsonRequest(
    String url,
    String method,
    String body,
    String contentType,
    String token
  ) throws Exception {
    HttpURLConnection c = connect(url, method, token);
    try {
      if (body != null) {
        c.setDoOutput(true);
        c.setRequestProperty("Content-Type", contentType);
        try (OutputStream out = c.getOutputStream()) {
          out.write(body.getBytes(StandardCharsets.UTF_8));
        }
      }
      int status = c.getResponseCode();
      if (status < 200 || status >= 300) throw new IOException(
        providerError(status)
      );
      try (InputStream in = c.getInputStream()) {
        return new JSONObject(readLimited(in, 2_000_000));
      }
    } finally {
      c.disconnect();
    }
  }

  private static String readLimited(InputStream in, int max) throws Exception {
    ByteArrayOutputStream out = new ByteArrayOutputStream();
    byte[] buf = new byte[8192];
    int len;
    while ((len = in.read(buf)) != -1) {
      if (out.size() + len > max) throw new IOException(
        "Provider response was too large."
      );
      out.write(buf, 0, len);
    }
    return out.toString("UTF-8");
  }

  private static String providerError(int status) {
    return status == 401
      ? "AI authorization expired or the API key is invalid. Reconnect in Settings."
      : status == 429
        ? "Your AI provider usage or rate limit was reached. Try offline mode or check your provider allowance."
        : status == 403
          ? "This account is not authorized for the selected service."
          : status == 400
            ? "The selected model or request is not supported by this account. Check AI settings."
            : "AI provider request failed (HTTP " +
              status +
              "). Try again later.";
  }

  @PluginMethod
  public void signIn(PluginCall call) {
    if (!signingIn.compareAndSet(false, true)) {
      call.reject("A sign-in is already in progress.");
      return;
    }
    lastAuthError = "";
    final int attempt = generation.get();
    authIo.execute(() -> {
      ServerSocket listener = null;
      try {
        listener = new ServerSocket(0, 2, InetAddress.getByName("127.0.0.1"));
        listener.setSoTimeout(600000);
        callbackServer = listener;
        String redirect =
          "http://127.0.0.1:" + listener.getLocalPort() + "/auth/callback";
        String state = random(),
          nonce = random(),
          verifier = random();
        String challenge = Base64.encodeToString(
          MessageDigest.getInstance("SHA-256").digest(
            verifier.getBytes(StandardCharsets.US_ASCII)
          ),
          Base64.URL_SAFE | Base64.NO_WRAP | Base64.NO_PADDING
        );
        String host = prefs().getString("host-id", null);
        if (host == null) {
          host = "urn:uuid:" + UUID.randomUUID();
          if (
            !prefs().edit().putString("host-id", host).commit()
          ) throw new IOException("Could not persist sign-in host.");
        }
        String oldRaw = secret("oauth");
        JSONObject old =
          oldRaw == null ? new JSONObject() : new JSONObject(oldRaw);
        String client = old.optString("client_id", "dynamic_agent_client");
        Map<String, String> params = values(
          "client_id",
          client,
          "ext_agent_host_id",
          host,
          "response_type",
          "code",
          "redirect_uri",
          redirect,
          "scope",
          "openid profile email offline_access resource.invoke chatgpt.tokens.use.direct",
          "resource",
          RESOURCE,
          "state",
          state,
          "nonce",
          nonce,
          "code_challenge_method",
          "S256",
          "code_challenge",
          challenge
        );
        if (client.equals("dynamic_agent_client")) params.put(
          "agent_name_hint",
          "Daywell Wellness"
        );
        else if (old.has("id_token")) params.put(
          "id_token_hint",
          old.getString("id_token")
        );
        String url = ISSUER + "/api/accounts/authorize?" + form(params);
        getActivity().runOnUiThread(() -> {
          try {
            new CustomTabsIntent.Builder()
              .setShowTitle(true)
              .build()
              .launchUrl(getActivity(), Uri.parse(url));
          } catch (Exception e) {
            closeCallback();
          }
        });
        Uri callback = null;
        long deadline = System.currentTimeMillis() + 600000;
        while (System.currentTimeMillis() < deadline) {
          listener.setSoTimeout(
            (int) Math.max(1, deadline - System.currentTimeMillis())
          );
          try (Socket socket = listener.accept()) {
            socket.setSoTimeout(5000);
            BufferedReader reader = new BufferedReader(
              new InputStreamReader(
                socket.getInputStream(),
                StandardCharsets.UTF_8
              )
            );
            String line = reader.readLine();
            if (line == null || line.length() > 8192) continue;
            String[] request = line.split(" ");
            if (request.length < 2) continue;
            Uri uri = Uri.parse("http://127.0.0.1" + request[1]);
            boolean valid =
              "/auth/callback".equals(uri.getPath()) &&
              state.equals(uri.getQueryParameter("state"));
            String body = valid
              ? "<!doctype html><meta name=viewport content='width=device-width'><title>Daywell</title><h2>Return to Daywell</h2><p>Your authorization is being checked. You can close this tab.</p>"
              : "Invalid callback. Return to Daywell and try again.";
            byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
            OutputStream out = socket.getOutputStream();
            out.write(
              (
                (valid ? "HTTP/1.1 200 OK" : "HTTP/1.1 400 Bad Request") +
                "\r\nContent-Type: text/html; charset=utf-8\r\nCache-Control: no-store\r\nContent-Security-Policy: default-src 'none'\r\nContent-Length: " +
                bytes.length +
                "\r\nConnection: close\r\n\r\n"
              ).getBytes(StandardCharsets.US_ASCII)
            );
            out.write(bytes);
            out.flush();
            if (valid) {
              callback = uri;
              break;
            }
          }
        }
        if (callback == null) throw new IOException(
          "Sign-in timed out. Please try again."
        );
        if (callback.getQueryParameter("error") != null) throw new IOException(
          "Sign-in was declined. You can use offline mode or an API key."
        );
        String code = callback.getQueryParameter("code"),
          issued = callback.getQueryParameter("client_id");
        if (client.equals("dynamic_agent_client")) {
          if (
            issued == null ||
            issued.isEmpty() ||
            issued.equals("dynamic_agent_client")
          ) throw new IOException(
            "OpenAI did not issue an application registration."
          );
          client = issued;
        } else if (
          issued != null && !issued.equals(client)
        ) throw new IOException("Sign-in registration did not match.");
        if (code == null) throw new IOException("Missing authorization code.");
        if (generation.get() != attempt) throw new IOException(
          "Sign-in was cancelled."
        );
        old.put("client_id", client);
        storeSecret("oauth", old.toString());
        JSONObject token = jsonRequest(
          ISSUER + "/api/accounts/oauth/token",
          "POST",
          form(
            values(
              "grant_type",
              "authorization_code",
              "client_id",
              client,
              "code",
              code,
              "code_verifier",
              verifier,
              "redirect_uri",
              redirect,
              "resource",
              RESOURCE
            )
          ),
          "application/x-www-form-urlencoded",
          null
        );
        JSONObject identity = verifyIdentity(
          token.getString("id_token"),
          client,
          nonce
        );
        if (
          old.has("subject") &&
          !old.getString("subject").equals(identity.getString("sub"))
        ) throw new IOException(
          "Signed-in account did not match. Disconnect first to change accounts."
        );
        if (
          !Arrays.asList(token.optString("scope").split(" ")).contains(
            "chatgpt.tokens.use.direct"
          )
        ) throw new IOException(
          "ChatGPT plan usage was not granted. Use an API key or authorize plan usage."
        );
        token.put("client_id", client);
        token.put("subject", identity.getString("sub"));
        token.put("email", identity.optString("email", "ChatGPT account"));
        token.put(
          "expires_at",
          System.currentTimeMillis() + token.optLong("expires_in", 3600) * 1000
        );
        if (generation.get() != attempt) throw new IOException(
          "Sign-in was cancelled."
        );
        storeSecret("oauth", token.toString());
        call.resolve(new JSObject().put("email", token.getString("email")));
      } catch (SocketTimeoutException e) {
        lastAuthError = "Sign-in timed out. Return to Daywell and try again.";
        call.reject(lastAuthError);
      } catch (Exception e) {
        lastAuthError =
          e instanceof IOException
            ? e.getMessage()
            : "Could not verify the ChatGPT sign-in. Offline mode remains available.";
        call.reject(lastAuthError);
      } finally {
        try {
          if (listener != null) listener.close();
        } catch (Exception ignored) {}
        callbackServer = null;
        signingIn.set(false);
        returnToApp();
      }
    });
  }

  private void returnToApp() {
    getActivity().runOnUiThread(() -> {
      Intent launch = getContext()
        .getPackageManager()
        .getLaunchIntentForPackage(getContext().getPackageName());
      if (launch != null) getActivity().startActivity(
        launch.addFlags(
          Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP
        )
      );
    });
  }

  private JSONObject verifyIdentity(String jwt, String client, String nonce)
    throws Exception {
    String[] parts = jwt.split("\\.");
    if (parts.length != 3) throw new IOException("Invalid identity token.");
    JSONObject header = new JSONObject(
      new String(
        Base64.decode(parts[0], Base64.URL_SAFE),
        StandardCharsets.UTF_8
      )
    );
    if (!"RS256".equals(header.optString("alg"))) throw new IOException(
      "Unsupported identity signature."
    );
    JSONObject discovery = jsonRequest(
      ISSUER + "/.well-known/openid-configuration",
      "GET",
      null,
      null,
      null
    );
    if (!ISSUER.equals(discovery.getString("issuer"))) throw new IOException(
      "Invalid identity issuer."
    );
    JSONObject keys = jsonRequest(
      discovery.getString("jwks_uri"),
      "GET",
      null,
      null,
      null
    );
    JSONArray list = keys.getJSONArray("keys");
    boolean verified = false;
    for (int i = 0; i < list.length(); i++) {
      JSONObject key = list.getJSONObject(i);
      if (
        !header.getString("kid").equals(key.optString("kid")) ||
        !"RSA".equals(key.optString("kty"))
      ) continue;
      BigInteger n = new BigInteger(
          1,
          Base64.decode(key.getString("n"), Base64.URL_SAFE)
        ),
        e = new BigInteger(
          1,
          Base64.decode(key.getString("e"), Base64.URL_SAFE)
        );
      Signature sig = Signature.getInstance("SHA256withRSA");
      sig.initVerify(
        KeyFactory.getInstance("RSA").generatePublic(new RSAPublicKeySpec(n, e))
      );
      sig.update(
        (parts[0] + "." + parts[1]).getBytes(StandardCharsets.US_ASCII)
      );
      verified = sig.verify(Base64.decode(parts[2], Base64.URL_SAFE));
      if (verified) break;
    }
    if (!verified) throw new IOException(
      "Identity signature verification failed."
    );
    JSONObject claims = new JSONObject(
      new String(
        Base64.decode(parts[1], Base64.URL_SAFE),
        StandardCharsets.UTF_8
      )
    );
    Object aud = claims.get("aud");
    boolean audience = client.equals(aud);
    if (aud instanceof JSONArray) {
      JSONArray audiences = (JSONArray) aud;
      for (int i = 0; i < audiences.length(); i++) if (
        client.equals(audiences.optString(i))
      ) audience = true;
    }
    if (
      !audience ||
      !ISSUER.equals(claims.optString("iss")) ||
      !nonce.equals(claims.optString("nonce")) ||
      claims.optLong("exp") <= System.currentTimeMillis() / 1000 - 5 ||
      claims.optLong("iat") <= 0 ||
      claims.optLong("iat") > System.currentTimeMillis() / 1000 + 60 ||
      claims.optLong("nbf", 0) > System.currentTimeMillis() / 1000 + 5 ||
      claims.optString("sub").isEmpty()
    ) throw new IOException(
      "Identity token claims did not match this sign-in."
    );
    return claims;
  }

  private String accessToken() throws Exception {
    String raw = secret("oauth");
    if (raw == null) throw new IOException(
      "Connect ChatGPT in Settings first."
    );
    JSONObject saved = new JSONObject(raw);
    if (
      saved.optLong("expires_at") > System.currentTimeMillis() + 60000
    ) return saved.getString("access_token");
    int current = generation.get();
    if (!saved.has("refresh_token")) throw new IOException(
      "Reconnect your ChatGPT account."
    );
    JSONObject fresh = jsonRequest(
      ISSUER + "/api/accounts/oauth/token",
      "POST",
      form(
        values(
          "grant_type",
          "refresh_token",
          "client_id",
          saved.getString("client_id"),
          "refresh_token",
          saved.getString("refresh_token"),
          "resource",
          RESOURCE
        )
      ),
      "application/x-www-form-urlencoded",
      null
    );
    for (Iterator<String> it = fresh.keys(); it.hasNext(); ) {
      String key = it.next();
      saved.put(key, fresh.get(key));
    }
    if (
      !Arrays.asList(saved.optString("scope").split(" ")).contains(
        "chatgpt.tokens.use.direct"
      )
    ) throw new IOException(
      "ChatGPT plan permission is no longer available. Reconnect your account."
    );
    saved.put(
      "expires_at",
      System.currentTimeMillis() + fresh.optLong("expires_in", 3600) * 1000
    );
    if (generation.get() != current) throw new IOException(
      "AI access was disconnected."
    );
    storeSecret("oauth", saved.toString());
    return saved.getString("access_token");
  }

  @PluginMethod
  public void models(PluginCall call) {
    io.execute(() -> {
      try {
        JSONObject catalog = jsonRequest(
          RESOURCE + "/models",
          "GET",
          null,
          null,
          accessToken()
        );
        JSONArray data = catalog.optJSONArray("models");
        JSArray out = new JSArray();
        if (data != null) for (int i = 0; i < data.length(); i++) {
          JSONObject model = data.getJSONObject(i);
          if ("list".equals(model.optString("visibility"))) {
            JSObject item = new JSObject();
            item.put("id", model.getString("slug"));
            item.put(
              "name",
              model.optString("display_name", model.getString("slug"))
            );
            out.put(item);
          }
        }
        call.resolve(new JSObject().put("models", out));
      } catch (Exception e) {
        call.reject(
          e instanceof IOException
            ? e.getMessage()
            : "Could not list models for this ChatGPT account."
        );
      }
    });
  }

  @PluginMethod
  public void ask(PluginCall call) {
    String input = call.getString("input", ""),
      model = call.getString("model", ""),
      instructions = call.getString("instructions", "");
    if (input.length() > 100000 || !model.matches("[a-zA-Z0-9._:-]{1,100}")) {
      call.reject("Request exceeds the local input limit or model is invalid.");
      return;
    }
    io.execute(() -> {
      HttpURLConnection c = null;
      try {
        boolean oauth = "chatgpt".equals(call.getString("mode"));
        String token = oauth ? accessToken() : secret("api-key");
        if (token == null) throw new IOException(
          "Save an API key in Settings first."
        );
        String image = call.getString("image", null);
        if (
          image != null &&
          (image.length() > 2_000_000 ||
            !image.matches("^data:image/jpeg;base64,[A-Za-z0-9+/=]+$"))
        ) throw new IOException("Invalid photo. Choose another JPEG image.");
        JSONObject body = new JSONObject();
        body.put("model", model);
        body.put("store", false);
        body.put("stream", true);
        body.put("instructions", instructions);
        JSONArray content = new JSONArray().put(
          new JSONObject().put("type", "input_text").put("text", input)
        );
        if (image != null) content.put(
          new JSONObject().put("type", "input_image").put("image_url", image)
        );
        body.put(
          "input",
          new JSONArray().put(
            new JSONObject().put("role", "user").put("content", content)
          )
        );
        body.put("reasoning", new JSONObject().put("effort", "low"));
        if (!oauth) body.put("max_output_tokens", 3000);
        c = connect(RESOURCE + "/responses", "POST", token);
        c.setRequestProperty("Content-Type", "application/json");
        c.setRequestProperty("Accept", "text/event-stream");
        c.setDoOutput(true);
        try (OutputStream out = c.getOutputStream()) {
          out.write(body.toString().getBytes(StandardCharsets.UTF_8));
        }
        int status = c.getResponseCode();
        if (status < 200 || status >= 300) throw new IOException(
          providerError(status)
        );
        StringBuilder text = new StringBuilder();
        JSONObject usage = new JSONObject();
        boolean complete = false;
        long deadline = System.currentTimeMillis() + 180000;
        try (
          BufferedReader reader = new BufferedReader(
            new InputStreamReader(c.getInputStream(), StandardCharsets.UTF_8)
          )
        ) {
          String line;
          while ((line = reader.readLine()) != null) {
            if (System.currentTimeMillis() > deadline) throw new IOException(
              "AI request timed out. Try a shorter question."
            );
            if (!line.startsWith("data: ")) continue;
            String payload = line.substring(6);
            if (payload.equals("[DONE]")) continue;
            if (payload.length() > 2_000_000) throw new IOException(
              "AI response was too large."
            );
            JSONObject event = new JSONObject(payload);
            String type = event.optString("type");
            if (type.equals("response.output_text.delta")) text.append(
              event.optString("delta")
            );
            if (text.length() > 100000) throw new IOException(
              "AI response exceeded the local size limit."
            );
            if (type.equals("response.completed")) {
              complete = true;
              JSONObject response = event.optJSONObject("response");
              if (response != null) usage = response.optJSONObject("usage");
            }
            if (
              type.equals("response.failed") || type.equals("error")
            ) throw new IOException(
              "Your AI provider could not complete this response. Check your model, plan allowance, or API billing."
            );
            if (type.equals("response.incomplete")) throw new IOException(
              "AI response was incomplete. Try a more focused question."
            );
          }
        }
        if (!complete) throw new IOException(
          "AI connection ended before completion. Your records are safe."
        );
        if (text.length() == 0) throw new IOException(
          "AI returned no text. Try a shorter question."
        );
        JSObject result = new JSObject();
        result.put("text", text.toString());
        result.put("input", usage == null ? 0 : usage.optInt("input_tokens"));
        result.put("output", usage == null ? 0 : usage.optInt("output_tokens"));
        call.resolve(result);
      } catch (Exception e) {
        call.reject(
          e instanceof IOException
            ? e.getMessage()
            : "AI request failed. Your offline records are unchanged."
        );
      } finally {
        if (c != null) c.disconnect();
      }
    });
  }

  @Override
  protected void handleOnDestroy() {
    closeCallback();
    io.shutdown();
    storageIo.shutdown();
    authIo.shutdown();
    super.handleOnDestroy();
  }
}
