import { FISHEYE_MAP } from "../../utils/fisheyeMap";
import "./PoseCounter.css";

export default function PoseCounter({ remaining }) {
  return (
    <div className="pose-counter">
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
        <filter id="pose-counter-fisheye" x="-20%" y="-20%" width="140%" height="140%">
          <feImage href={FISHEYE_MAP} x="0" y="0" width="100%" height="100%" result="map" preserveAspectRatio="none" />
          <feDisplacementMap in="SourceGraphic" in2="map" scale="40" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>
      <span className="pose-counter__number">{remaining}</span>
    </div>
  );
}
