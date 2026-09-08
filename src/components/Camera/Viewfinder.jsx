import "./Viewfinder.css";
import { FISHEYE_MAP } from "../../utils/fisheyeMap";

export default function Viewfinder({ videoRef, error, flashPulse, retry }) {
  return (
    <div className="viewfinder-fill">
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
        <filter id="viewfinder-fisheye" x="-20%" y="-20%" width="140%" height="140%">
          <feImage href={FISHEYE_MAP} x="0" y="0" width="100%" height="100%" result="map" preserveAspectRatio="none" />
          <feDisplacementMap in="SourceGraphic" in2="map" scale="60" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>

      {error ? (
        <div className="viewfinder-fill__error">
          <p>{error}</p>
          {retry && (
            <button type="button" className="viewfinder-fill__retry" onClick={retry}>
              Réessayer
            </button>
          )}
        </div>
      ) : (
        <video ref={videoRef} className="viewfinder-fill__video" muted playsInline />
      )}
      {flashPulse && <div className="viewfinder-fill__flash-pulse" />}
    </div>
  );
}
