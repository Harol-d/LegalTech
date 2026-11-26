import { Injectable, signal, computed, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type ThemeMode = 'light' | 'dark';

const STORAGE_KEY = 'legal-doc-theme';

/**
 * Servicio de tema (claro/oscuro).
 * - Persiste la preferencia en localStorage.
 * - Aplica/elimina la clase `.dark` sobre <html> (el selector que usa PrimeNG Aura).
 * - Respeta el sistema operativo como valor inicial cuando no hay preferencia guardada.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  private readonly _mode = signal<ThemeMode>(this.resolveInitialMode());

  /** Modo actual: 'light' | 'dark' */
  readonly mode = this._mode.asReadonly();

  /** true cuando el modo activo es oscuro */
  readonly isDark = computed(() => this._mode() === 'dark');

  /** Icono PrimeIcons acorde al modo activo */
  readonly icon = computed(() => (this._mode() === 'dark' ? 'pi pi-sun' : 'pi pi-moon'));

  /** Tooltip del botón de toggle */
  readonly tooltip = computed(() =>
    this._mode() === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro',
  );

  constructor() {
    if (this.isBrowser) {
      this.applyToDom(this._mode());
    }
  }

  toggle(): void {
    this.setMode(this._mode() === 'dark' ? 'light' : 'dark');
  }

  setMode(mode: ThemeMode): void {
    this._mode.set(mode);
    if (this.isBrowser) {
      this.applyToDom(mode);
      try {
        localStorage.setItem(STORAGE_KEY, mode);
      } catch {
        // localStorage no disponible (SSR, modo privado estricto)
      }
    }
  }

  // ── Privados ──────────────────────────────────────────────────────────────

  private resolveInitialMode(): ThemeMode {
    if (!this.isBrowser) return 'light';

    // 1. Preferencia guardada
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
      if (saved === 'dark' || saved === 'light') return saved;
    } catch {
      // ignorar
    }

    // 2. Preferencia del sistema operativo
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  private applyToDom(mode: ThemeMode): void {
    const html = document.documentElement;
    if (mode === 'dark') {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
  }
}
