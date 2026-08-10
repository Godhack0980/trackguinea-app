export function getFirebaseAuthErrorMessage(error: any): string {
  if (!error) return "Une erreur inconnue est survenue.";
  
  const code = error.code || "";
  const message = error.message || "";

  switch (code) {
    case "auth/email-already-in-use":
      return "Cette adresse e-mail est déjà utilisée par un autre compte.";
    case "auth/weak-password":
      return "Le mot de passe est trop faible. Il doit comporter au moins 8 caractères, une majuscule, une minuscule, un chiffre et un caractère spécial.";
    case "auth/invalid-email":
      return "L'adresse e-mail renseignée n'est pas valide.";
    case "auth/operation-not-allowed":
      return "L'inscription par e-mail/mot de passe n'est pas activée.";
    case "auth/network-request-failed":
      return "Erreur de connexion réseau. Veuillez vérifier votre connexion Internet.";
    case "auth/too-many-requests":
      return "Trop de tentatives échouées. Veuillez réinstaller ou patienter quelques instants.";
    case "auth/user-disabled":
      return "Ce compte a été désactivé par l'administrateur.";
    default:
      if (message.includes("Password should be") || message.includes("password policy")) {
        return "Le mot de passe ne respecte pas les exigences de sécurité Firebase (8+ caractères, majuscule, minuscule, chiffre et caractère spécial).";
      }
      return message || "Une erreur est survenue lors de l'inscription. Veuillez réessayer.";
  }
}
