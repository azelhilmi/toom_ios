import QRCode from "qrcode";

/**
 * Génère une data URL PNG du QR code pour un lien d'invitation. Généré
 * entièrement côté client (canvas), aucun appel réseau nécessaire.
 */
export async function generateInviteQrCode(url) {
  return QRCode.toDataURL(url, {
    width: 240,
    margin: 1,
    color: { dark: "#1a1a1a", light: "#ffffff" },
  });
}
