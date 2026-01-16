import 'react-i18next';

// Déclaration pour que t() retourne string au lieu de DefaultTFuncReturn
declare module 'react-i18next' {
  interface CustomTypeOptions {
    returnNull: false;
    returnEmptyString: false;
    defaultNS: 'translation';
  }
}

// Surcharge pour garantir que t() retourne string
declare module 'i18next' {
  interface CustomTypeOptions {
    returnNull: false;
    returnEmptyString: false;
    returnObjects: false;
  }
}
