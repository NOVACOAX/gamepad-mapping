import { LIGHTROOM_BASIC_SLIDERS } from "../constants/lightroomSliders";

interface LrSliderSelectorProps {
  currentIndex: number;
  onSelect: (index: number) => void;
}

export function LrSliderSelector({ currentIndex, onSelect }: LrSliderSelectorProps) {
  return (
    <div className="lr-slider-selector">
      <div className="lr-slider-selector-header">
        <span className="lr-slider-selector-title">Basic Panel</span>
        <span className="lr-slider-selector-hint">d-pad ◀▶ cycle · L-stick ◀▶ adjust</span>
      </div>
      <div className="lr-slider-selector-list">
        {LIGHTROOM_BASIC_SLIDERS.map((name, i) => (
          <button
            key={name}
            className={`lr-slider-item ${i === currentIndex ? "lr-slider-item--active" : ""}`}
            onClick={() => onSelect(i)}
            title={`Select ${name}`}
          >
            <span className="lr-slider-index">{i + 1}</span>
            <span className="lr-slider-name">{name}</span>
            {i === currentIndex && <span className="lr-slider-cursor">◀▶</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
