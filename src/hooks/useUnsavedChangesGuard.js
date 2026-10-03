import { useCallback, useEffect } from 'react';
import { useBeforeUnload, useBlocker } from 'react-router-dom';

/**
 * Bloque la navigation (interne et fermeture d'onglet)
 * quand l'utilisateur a des modifications non sauvegardées.
 *
 * @param {boolean} isDirty - true si le formulaire a des changements non sauvegardés
 * @param {string} message - Message affiché dans la boîte de confirmation
 */
export function useUnsavedChangesGuard(
  isDirty,
  message = 'Vous avez des modifications non sauvegardées. Voulez-vous vraiment quitter cette page ?'
) {
  // Bloquer la navigation interne React Router
  const blocker = useBlocker(
    useCallback(
      ({ currentLocation, nextLocation }) =>
        isDirty && currentLocation.pathname !== nextLocation.pathname,
      [isDirty]
    )
  );

  // Bloquer la fermeture/rechargement de l'onglet
  useBeforeUnload(
    useCallback(
      (e) => {
        if (isDirty) {
          e.preventDefault();
          e.returnValue = message;
        }
      },
      [isDirty, message]
    )
  );

  // Quand le blocker est actif, afficher une confirmation native
  useEffect(() => {
    if (blocker.state === 'blocked') {
      const confirmed = window.confirm(message);
      if (confirmed) {
        blocker.proceed();
      } else {
        blocker.reset();
      }
    }
  }, [blocker, message]);
}
