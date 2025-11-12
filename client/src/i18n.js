import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

i18n
  .use(initReactI18next) // passes i18n down to react-i18next
  .init({
    resources: {
      en: {
        translation: {
          "welcome": "Welcome to VerifySign",
          "login_title": "Sign In",
          "login_description": "Access your control panel and manage your evidence.",
          "email_label": "Email *",
          "password_label": "Password *",
          "login_button": "Sign In",
          "no_account": "Don't have an account?",
          "register_button": "Register",
          "already_have_account": "Already have an account?",
          "continue_as_guest": "Continue as guest",
          "create_account_title": "Create Account",
          "create_account_description": "Register to access all VerifySign features.",
          "confirm_password_label": "Confirm Password *",
          "register_submit_button": "Register",
          "terms_privacy_agreement": "By continuing, you agree to our {{termsLink}} and {{privacyLink}}.",
          "terms_of_service": "Terms of Service",
          "privacy_policy": "Privacy Policy"
        }
      },
      es: {
        translation: {
          "welcome": "Bienvenido a VerifySign",
          "login_title": "Iniciar Sesión",
          "login_description": "Accede a tu panel de control y gestiona tus evidencias.",
          "email_label": "Email *",
          "password_label": "Contraseña *",
          "login_button": "Iniciar Sesión",
          "no_account": "¿No tienes cuenta?",
          "register_button": "Regístrate",
          "already_have_account": "¿Ya tienes cuenta?",
          "continue_as_guest": "Continuar como invitado",
          "create_account_title": "Crear Cuenta",
          "create_account_description": "Regístrate para acceder a todas las funciones de VerifySign.",
          "confirm_password_label": "Confirmar Contraseña *",
          "register_submit_button": "Registrarse",
          "terms_privacy_agreement": "Al continuar, aceptas nuestros {{termsLink}} y {{privacyLink}}.",
          "terms_of_service": "Términos de Servicio",
          "privacy_policy": "Política de Privacidad"
        }
      }
    },
    lng: "es", // default language
    fallbackLng: "en",

    interpolation: {
      escapeValue: false // react already safes from xss
    }
  });

export default i18n;
