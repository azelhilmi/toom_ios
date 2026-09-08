import BackToCameraButton from "../components/UI/BackToCameraButton";
import "./TermsPage.css";

export default function TermsPage() {
  return (
    <div className="terms-page watermark-bg">
      <BackToCameraButton />
      <img src="/brand/icon-round-small.webp" alt="Toom" className="page-header-logo" />
      <h1>Conditions Générales d'Utilisation</h1>
      <p className="terms-page__updated">Dernière mise à jour : septembre 2026</p>

      <section>
        <h2>1. Objet</h2>
        <p>
          Toom est une application d'appareil photo jetable virtuel. Les
          présentes conditions s'appliquent à la création et à l'utilisation
          d'un événement partagé (pellicule commune entre plusieurs invités).
        </p>
      </section>

      <section>
        <h2>2. Fonctionnement d'un événement</h2>
        <p>
          En créant un événement, tu deviens organisateur : tu choisis un
          nombre de poses par invité et une date de révélation. Les invités
          qui rejoignent via ton lien ou ton code prennent des photos qui ne
          sont visibles par personne (pas même toi) avant cette date.
        </p>
      </section>

      <section>
        <h2>3. Contenu et responsabilité</h2>
        <p>
          Chaque personne reste responsable des photos qu'elle prend. Merci
          de ne pas utiliser Toom pour capturer ou diffuser du contenu
          illégal, portant atteinte à la vie privée d'autrui, ou contraire
          aux bonnes mœurs. L'organisateur peut supprimer à tout moment son
          événement, ce qui efface définitivement toutes les photos et
          pellicules associées.
        </p>
      </section>

      <section>
        <h2>4. Données personnelles</h2>
        <p>
          Les photos et informations d'un événement (nom, invités, images)
          sont stockées pour permettre son fonctionnement et sont supprimées
          définitivement lorsque l'organisateur supprime l'événement.
          Aucune donnée n'est vendue ni partagée avec des tiers.
        </p>
      </section>

      <section>
        <h2>5. Disponibilité</h2>
        <p>
          Toom est un projet indépendant, fourni "en l'état", sans garantie
          de disponibilité continue. Fais des sauvegardes (téléchargement)
          des photos qui te tiennent à cœur.
        </p>
      </section>
    </div>
  );
}
