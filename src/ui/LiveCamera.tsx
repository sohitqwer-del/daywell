import { useEffect, useRef, useState } from "react";
import { CameraPreview } from "@capacitor-community/camera-preview";
import { Camera, RotateCcw, X, Zap, LoaderCircle } from "lucide-react";
import { preparePhoto } from "../photos";
export default function LiveCamera({
  onPhoto,
  onCancel,
  onFallback,
}: {
  onPhoto: (photo: { image: string; thumbnail: string }) => void;
  onCancel: () => void;
  onFallback: () => void;
}) {
  const frame = useRef<HTMLDivElement>(null),
    [ready, setReady] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [torch, setTorch] = useState(false),
    [canTorch, setCanTorch] = useState(false);
  const alive = useRef(true);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    alive.current = true;
    setReady(false);
    setError("");
    setTorch(false);
    setCanTorch(false);
    document.documentElement.classList.add("live-camera-active");
    const start = async () => {
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );
      if (!active) return;
      const rect = frame.current!.getBoundingClientRect();
      try {
        await CameraPreview.start({
          position: "rear",
          x: Math.round(rect.left),
          y: Math.round(rect.top),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          toBack: false,
          disableAudio: true,
          enableZoom: true,
          lockAndroidOrientation: true,
        });
        if (!active) {
          await CameraPreview.stop();
          return;
        }
        setReady(true);
        try {
          const modes = await CameraPreview.getSupportedFlashModes();
          if (active) setCanTorch(modes.result.includes("torch"));
        } catch {
          if (active) setCanTorch(false);
        }
      } catch (e) {
        if (active)
          setError(
            "Camera could not start. Allow camera access in Android settings, or use the system camera.",
          );
      }
    };
    void start();
    return () => {
      active = false;
      alive.current = false;
      document.documentElement.classList.remove("live-camera-active");
      void CameraPreview.stop().catch(() => {});
    };
  }, [attempt]);
  async function close(next: () => void) {
    // Never leave navigation waiting on a pending camera permission/start call.
    alive.current = false;
    next();
    void CameraPreview.stop().catch(() => {});
  }
  async function capture() {
    if (!ready || busy) return;
    setBusy(true);
    setError("");
    try {
      const photo = await CameraPreview.capture({
        width: 1280,
        height: 1280,
        quality: 85,
      });
      if (!alive.current) return;
      await CameraPreview.stop();
      setReady(false);
      const next = await preparePhoto(
        photo.value.startsWith("data:")
          ? photo.value
          : `data:image/jpeg;base64,${photo.value}`,
      );
      if (alive.current) onPhoto(next);
    } catch {
      setError(
        "Could not capture that photo. Try again or use the system camera.",
      );
      setBusy(false);
      setReady(false);
    }
  }
  return (
    <div className="live-camera">
      <div className="live-camera-title">
        <div>
          <span className="eyebrow">DAYWELL CAMERA</span>
          <h3>Frame your whole plate</h3>
        </div>
        <button
          className="icon-button"
          aria-label="Close camera"
          onClick={() => void close(onCancel)}
        >
          <X size={21} />
        </button>
      </div>
      <div className="live-camera-frame" ref={frame}>
        {!ready && (
          <span>
            <LoaderCircle className="spin" size={25} /> Opening camera…
          </span>
        )}
      </div>
      <p className="camera-instruction">
        Pinch to zoom. Keep bowls and sides in the frame.
      </p>
      <div className="camera-controls">
        <button
          className="icon-button"
          aria-label="Switch camera"
          disabled={!ready || busy}
          onClick={() =>
            void CameraPreview.flip().catch(() =>
              setError("Camera switch unavailable."),
            )
          }
        >
          <RotateCcw size={22} />
        </button>
        <button
          className="camera-shutter"
          aria-label="Capture meal photo"
          disabled={!ready || busy}
          onClick={() => void capture()}
        >
          {busy ? (
            <LoaderCircle className="spin" size={25} />
          ) : (
            <Camera size={26} />
          )}
        </button>
        <button
          className={"icon-button " + (torch ? "torch-on" : "")}
          aria-label="Toggle camera light"
          disabled={!ready || !canTorch || busy}
          onClick={() =>
            void CameraPreview.setFlashMode({
              flashMode: torch ? "off" : "torch",
            })
              .then(() => setTorch(!torch))
              .catch(() => setError("Camera light unavailable."))
          }
        >
          <Zap size={22} />
        </button>
      </div>
      {error && (
        <>
          <p role="alert" className="error-text">
            {error}
          </p>
          <button
            className="button wide"
            onClick={() => {
              setBusy(false);
              setAttempt((value) => value + 1);
            }}
          >
            Restart camera
          </button>
        </>
      )}
      <button
        className="text-button camera-fallback"
        onClick={() => void close(onFallback)}
      >
        Use system camera instead
      </button>
    </div>
  );
}
