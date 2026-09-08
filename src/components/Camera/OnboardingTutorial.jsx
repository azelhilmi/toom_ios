import { useState } from "react";
import { hotspotStyle } from "../../utils/hotspots";
import { markOnboardingSeen } from "../../utils/onboarding";
import "./OnboardingTutorial.css";

function buildSteps(layout) {
  const wheelHint = layout.wheelAxis === "horizontal" ? "vers la droite" : "vers le bas";
  return [
    {
      target: layout.filmWheel,
      arrow: "↗",
      title: "1. Charge la pellicule",
      text: `Glisse la molette ${wheelHint} jusqu'à l'arrêt.`,
    },
    {
      target: layout.viewfinder,
      arrow: "↑",
      title: "2. Cadre ton sujet",
      text: "Regarde dans le viseur pour composer ta photo.",
    },
    {
      target: layout.flashButton,
      arrow: "↑",
      title: "3. Flash si besoin",
      text: "En intérieur ou faible lumière, appuie sur le petit éclair.",
    },
    {
      target: layout.shutter,
      arrow: "↓",
      title: "4. Déclenche",
      text: "Une fois prêt, appuie sur le déclencheur. Patience : la photo se révèle 24h plus tard !",
    },
  ];
}

export default function OnboardingTutorial({ layout, onDone }) {
  const [stepIndex, setStepIndex] = useState(0);
  const steps = buildSteps(layout);
  const step = steps[stepIndex];
  const isLast = stepIndex === steps.length - 1;

  function finish() {
    markOnboardingSeen();
    onDone();
  }

  function next() {
    if (isLast) finish();
    else setStepIndex((i) => i + 1);
  }

  return (
    <div className="onboarding">
      <div className="onboarding__backdrop" />

      <div
        className="onboarding__ring"
        style={{
          left: hotspotStyle(step.target).left,
          top: hotspotStyle(step.target).top,
          transform: hotspotStyle(step.target).transform,
        }}
      />

      <div className="onboarding__bubble">
        <p className="onboarding__step-count">Étape {stepIndex + 1} / {steps.length}</p>
        <p className="onboarding__title">
          <span className="onboarding__arrow" aria-hidden="true">{step.arrow}</span> {step.title}
        </p>
        <p className="onboarding__text">{step.text}</p>

        <div className="onboarding__actions">
          <button type="button" className="onboarding__skip" onClick={finish}>
            Passer
          </button>
          <button type="button" className="onboarding__next" onClick={next}>
            {isLast ? "C'est parti !" : "Suivant"}
          </button>
        </div>
      </div>
    </div>
  );
}
