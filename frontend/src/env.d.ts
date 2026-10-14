/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}

interface ImportMetaEnv {
  /** REST-Endpunkt der Hauptanwendung für eingereichte Verfügbarkeiten (optional). */
  readonly VITE_SUBMIT_URL?: string
}
