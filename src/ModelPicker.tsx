import { useEffect, useState } from "react";
import { Native, isNative } from "./platform";
import type { State } from "./domain";
export default function ModelPicker({
  state: s,
  commit,
  connected,
}: {
  state: State;
  commit: (f: (s: State) => void) => void;
  connected: boolean;
}) {
  const [models, setModels] = useState<{ id: string; name: string }[]>([]),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    setError("");
    if (s.settings.aiMode === "chatgpt" && connected && isNative)
      Native.models()
        .then((result) => {
          if (active) {
            setModels(result.models);
            if (!result.models.some((m) => m.id === s.settings.model)) {
              const luna = result.models.find((m) => m.id.includes("luna"));
              if (luna)
                commit((s) => {
                  s.settings.model = luna.id;
                });
            }
          }
        })
        .catch(() => {
          if (active)
            setError("Unable to list account models. Reconnect and try again.");
        });
    return () => {
      active = false;
    };
  }, [s.settings.aiMode, connected]);
  const options =
    s.settings.aiMode === "chatgpt" && models.length
      ? models
      : [
          { id: "gpt-6-luna", name: "GPT-6 Luna · everyday questions" },
          { id: "gpt-6.1-terra", name: "GPT-6.1 Terra · deeper reviews" },
        ];
  return (
    <label className="field">
      <span>Model</span>
      <select
        value={s.settings.model}
        onChange={(e) =>
          commit((s) => {
            s.settings.model = e.target.value;
          })
        }
      >
        {!options.some((m) => m.id === s.settings.model) && (
          <option value={s.settings.model}>
            {s.settings.model} · select an available model
          </option>
        )}
        {options.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </select>
      {error && <small role="status">{error}</small>}
    </label>
  );
}
