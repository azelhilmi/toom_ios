import { NavLink } from "react-router-dom";
import "./NavBar.css";

export default function NavBar() {
  return (
    <nav className="nav-bar">
      <NavLink to="/" end className={({ isActive }) => (isActive ? "nav-bar__link nav-bar__link--active" : "nav-bar__link")}>
        Appareil
      </NavLink>
      <NavLink to="/gallery" className={({ isActive }) => (isActive ? "nav-bar__link nav-bar__link--active" : "nav-bar__link")}>
        Galerie
      </NavLink>
      <NavLink to="/event/new" className={({ isActive }) => (isActive ? "nav-bar__link nav-bar__link--active" : "nav-bar__link")}>
        Événement
      </NavLink>
    </nav>
  );
}
