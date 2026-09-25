import { EVENT_COLORS, normalizeColor } from "../lib/events";

export function ColorPicks({
  value,
  onChange,
  label,
  taken = [],
  takenLabel,
}: {
  value: string;
  onChange: (color: string) => void;
  label: string;
  taken?: string[];
  takenLabel?: string;
}) {
  const current = normalizeColor(value);
  const claimed = new Set(taken.map(normalizeColor).filter(Boolean));

  return (
    <div className="color-picks" role="group" aria-label={label}>
      {EVENT_COLORS.map((swatch) => {
        const unavailable = claimed.has(swatch) && swatch !== current;
        return (
          <button
            key={swatch}
            type="button"
            className={`color-pick${current === swatch ? " active" : ""}${unavailable ? " taken" : ""}`}
            style={{ background: swatch }}
            aria-label={unavailable ? takenLabel || swatch : swatch}
            title={unavailable ? takenLabel : undefined}
            aria-pressed={current === swatch}
            disabled={unavailable}
            onClick={() => onChange(swatch)}
          />
        );
      })}
    </div>
  );
}
