// ============================================================
// APP CONTEXT — Estado global asíncrono con Supabase
// ============================================================

import { createContext, useContext, useReducer, useEffect } from 'react';
import * as storage from '../services/storageService';
import { supabase } from '../lib/supabaseClient';
import { generateAutoAlerts, initSavingsEngine } from '../services/savingsEngine';
import { logger, setLoggerContext } from '../lib/logger';
import { toast } from '../lib/toast';
import { setAnalyticsUser, track } from '../lib/analytics';

const AppContext = createContext(null);

// ── Initial State ────────────────────────────────────────────

function getInitialState() {
  return {
    // Auth
    user: null,
    isLoadingAuth: true,
    // isLoadingData arranca en true solo si hay sesión guardada,
    // para evitar flash de "sin perfil" antes de que carguen los datos
    isLoadingData: true,

    // Onboarding — se reconcilia con Supabase tras loadData
    isOnboarded: storage.isOnboardingComplete(),
    onboarding: storage.getOnboarding(),

    // Core Data
    profiles: [],
    activeProfileId: storage.getActiveProfileId(),
    medications: [],
    recipes: [],
    alerts: [],
    cart: [],
    purchases: [],

    // Local Preferences
    settings: storage.getSettings(),
    subscription: { plan: 'free' },
    sidebarOpen: false,
  };
}

// ── Reducer ──────────────────────────────────────────────────

function appReducer(state, action) {
  switch (action.type) {
    case 'SET_AUTH': {
      return { ...state, user: action.payload, isLoadingAuth: false };
    }
    case 'SET_DATA_LOADED': {
      const payload = action.payload;
      const loadedProfiles = payload.profiles || [];
      // BUG 2 FIX: si hay perfiles en Supabase, el usuario ya completó onboarding
      // aunque localStorage haya sido limpiado o sea un dispositivo nuevo
      const hasProfiles = loadedProfiles.length > 0;
      const isOnboarded = hasProfiles ? true : state.isOnboarded;
      if (hasProfiles && !state.isOnboarded) {
        storage.saveOnboarding({ completed: true });
      }
      // Preservar activeProfileId si sigue siendo válido, si no usar el primero
      const currentActiveId = state.activeProfileId;
      const validActiveId = loadedProfiles.find(p => p.id === currentActiveId)
        ? currentActiveId
        : (loadedProfiles[0]?.id || currentActiveId || null);
      if (validActiveId && validActiveId !== currentActiveId) {
        storage.setActiveProfileId(validActiveId);
      }
      return {
        ...state,
        profiles: loadedProfiles,
        medications: payload.medications || [],
        alerts: payload.alerts || [],
        cart: payload.cart || [],
        recipes: payload.recipes || [],
        purchases: payload.purchases || [],
        activeProfileId: validActiveId,
        isOnboarded,
        isLoadingData: false,
      };
    }
    case 'SET_LOADING_DATA': {
      return { ...state, isLoadingData: action.payload };
    }
    case 'COMPLETE_ONBOARDING': {
      const data = { ...action.payload, completed: true };
      storage.saveOnboarding(data);
      return { ...state, isOnboarded: true, onboarding: data };
    }
    case 'ADD_PROFILE': {
      const profiles = [...state.profiles, action.payload];
      // If first profile, make it active
      if (profiles.length === 1) {
        storage.setActiveProfileId(action.payload.id);
        return { ...state, profiles, activeProfileId: action.payload.id };
      }
      return { ...state, profiles };
    }
    case 'UPDATE_PROFILE': {
      const profiles = state.profiles.map(p => p.id === action.payload.id ? { ...p, ...action.payload.updates } : p);
      return { ...state, profiles };
    }
    case 'DELETE_PROFILE': {
      const profiles = state.profiles.filter(p => p.id !== action.payload);
      const activeId = state.activeProfileId === action.payload ? (profiles[0]?.id || null) : state.activeProfileId;
      if (activeId !== state.activeProfileId) storage.setActiveProfileId(activeId);
      const medications = state.medications.filter(m => m.profileId !== action.payload);
      return { ...state, profiles, activeProfileId: activeId, medications };
    }
    case 'SET_ACTIVE_PROFILE': {
      storage.setActiveProfileId(action.payload);
      return { ...state, activeProfileId: action.payload };
    }
    case 'ADD_MEDICATION': {
      const medications = [...state.medications, action.payload];
      return { ...state, medications };
    }
    case 'UPDATE_MEDICATION': {
      const medications = state.medications.map(m => m.id === action.payload.id ? { ...m, ...action.payload.updates } : m);
      return { ...state, medications };
    }
    case 'DELETE_MEDICATION': {
      const medications = state.medications.filter(m => m.id !== action.payload);
      return { ...state, medications };
    }
    case 'ADD_RECIPE': {
      return { ...state, recipes: [...state.recipes, action.payload] };
    }
    case 'DELETE_RECIPE': {
      return { ...state, recipes: state.recipes.filter(r => r.id !== action.payload) };
    }
    case 'SET_RECIPES': {
      return { ...state, recipes: action.payload };
    }
    case 'UPDATE_ALERT': {
      const alerts = state.alerts.map(a => a.id === action.payload.id ? { ...a, ...action.payload.updates } : a);
      return { ...state, alerts };
    }
    case 'SET_ALERTS': {
      return { ...state, alerts: action.payload };
    }
    case 'ADD_TO_CART': {
      return { ...state, cart: [...state.cart, action.payload] };
    }
    case 'SET_CART': {
      return { ...state, cart: action.payload };
    }
    case 'REMOVE_FROM_CART': {
      // Decrementar cantidad; eliminar si llega a 0
      const cart = state.cart.map(i => {
        if (i.medicationId !== action.payload) return i;
        return { ...i, cantidad: (i.cantidad || 1) - 1 };
      }).filter(i => i.cantidad > 0);
      return { ...state, cart };
    }
    case 'DELETE_FROM_CART': {
      // Eliminar completamente sin importar cantidad
      return { ...state, cart: state.cart.filter(i => i.medicationId !== action.payload) };
    }
    case 'CLEAR_CART': {
      return { ...state, cart: [] };
    }
    case 'ADD_PURCHASE': {
      return { ...state, purchases: [...state.purchases, action.payload] };
    }
    case 'UPDATE_SETTINGS': {
      storage.updateSettings(action.payload);
      return { ...state, settings: storage.getSettings() };
    }
    case 'TOGGLE_SIDEBAR': {
      return { ...state, sidebarOpen: !state.sidebarOpen };
    }
    case 'CLOSE_SIDEBAR': {
      return { ...state, sidebarOpen: false };
    }
    case 'LOGOUT': {
      storage.clearSessionStorage();
      return { ...getInitialState(), isLoadingAuth: false, isLoadingData: false, isOnboarded: false };
    }
    case 'RESET_ALL': {
      storage.clearSessionStorage();
      localStorage.clear();
      return { ...getInitialState(), isLoadingAuth: false, isLoadingData: false, isOnboarded: false };
    }
    default:
      return state;
  }
}

// ── Provider ─────────────────────────────────────────────────

export function AppProvider({ children }) {
  const [state, dispatchRaw] = useReducer(appReducer, null, getInitialState);

  // Async Dispatch wrapper to intercept and save to DB
  const dispatch = async (action) => {
    switch (action.type) {
      case 'ADD_PROFILE': {
        const realId = await storage.addProfile(action.payload);
        if (realId) {
          // Reemplazar el ID local con el UUID real de Supabase
          const payloadWithRealId = { ...action.payload, id: realId };
          dispatchRaw({ ...action, payload: payloadWithRealId });
          return realId; // retornar para que el caller pueda usarlo
        } else {
          toast.error('Error al guardar el perfil. Intenta de nuevo.');
          return null;
        }
      }
      case 'UPDATE_PROFILE':
        await storage.updateProfile(action.payload.id, action.payload.updates);
        dispatchRaw(action);
        break;
      case 'DELETE_PROFILE':
        await storage.deleteProfile(action.payload);
        dispatchRaw(action);
        break;
      case 'ADD_MEDICATION': {
        const medResult = await storage.addMedication(action.payload);
        if (medResult.success) {
          // Usar el UUID real de Supabase
          const payloadWithRealId = { ...action.payload, id: medResult.id };
          dispatchRaw({ ...action, payload: payloadWithRealId });
        } else {
          toast.error('Error al guardar el medicamento.');
        }
        break;
      }
      case 'UPDATE_MEDICATION':
        await storage.updateMedication(action.payload.id, action.payload.updates);
        dispatchRaw(action);
        break;
      case 'DELETE_MEDICATION':
        await storage.deleteMedication(action.payload);
        dispatchRaw(action);
        break;
      case 'ADD_RECIPE': {
        const addResult = await storage.addRecipe(action.payload);
        // Reload recipes from DB to get correct id, filePath, and all fields
        const freshRecipes = await storage.getRecipes();
        dispatchRaw({ type: 'SET_RECIPES', payload: freshRecipes });
        break;
      }
      case 'DELETE_RECIPE': {
        await storage.deleteRecipe(action.payload);
        const remainingRecipes = await storage.getRecipes();
        dispatchRaw({ type: 'SET_RECIPES', payload: remainingRecipes });
        break;
      }
      case 'ADD_TO_CART':
        await storage.addToCart(action.payload);
        const updatedCart = await storage.getCart();
        dispatchRaw({ type: 'SET_CART', payload: updatedCart });
        break;
      case 'REMOVE_FROM_CART': {
        // Actualizar Supabase y recargar carrito para reflejar estado real
        const itemToRemove = action.payload; // medicationId = cart_item UUID
        await storage.removeFromCart(itemToRemove);
        const cartAfterRemove = await storage.getCart();
        dispatchRaw({ type: 'SET_CART', payload: cartAfterRemove });
        break;
      }
      case 'DELETE_FROM_CART': {
        // Eliminar completamente el item de Supabase (ignorar cantidad)
        await storage.deleteFromCart(action.payload);
        const cartAfterDelete = await storage.getCart();
        dispatchRaw({ type: 'SET_CART', payload: cartAfterDelete });
        break;
      }
      case 'CLEAR_CART':
        await storage.clearCart();
        dispatchRaw(action);
        break;
      case 'ADD_PURCHASE':
        await storage.addPurchase(action.payload);
        dispatchRaw(action);
        break;
      case 'LOGOUT': {
        try {
          const { error } = await supabase.auth.signOut();
          if (error) {
            toast.error(`Error al cerrar sesión: ${error.message}`);
            return false;
          }
          dispatchRaw(action);
          return true;
        } catch (e) {
          toast.error('Ocurrió un error inesperado al cerrar sesión.');
          return false;
        }
      }
      default:
        dispatchRaw(action);
    }
  };

  // 1. Check Auth Session
  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted) {
        dispatchRaw({ type: 'SET_AUTH', payload: session?.user || null });
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === 'SIGNED_OUT') {
        dispatchRaw({ type: 'LOGOUT' });
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        dispatchRaw({ type: 'SET_AUTH', payload: session?.user || null });
        setLoggerContext({ userId: session?.user?.id || null });
        setAnalyticsUser(session?.user?.id || null);
        if (event === 'SIGNED_IN') track('auth_session_restored');
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // 2. Fetch Data when User exists
  // BUG 3 FIX: depender de user.id (string estable) en lugar del objeto user
  // completo que Supabase recrea en cada TOKEN_REFRESHED, evitando recargas
  // innecesarias en cada cambio de pestaña o refresh de token.
  const userId = state.user?.id ?? null;

  useEffect(() => {
    if (!userId) {
      if (!state.isLoadingAuth) {
        dispatchRaw({ type: 'SET_LOADING_DATA', payload: false });
      }
      return;
    }

    async function loadData() {
      dispatchRaw({ type: 'SET_LOADING_DATA', payload: true });
      const t0 = performance.now();
      try {
        await initSavingsEngine();

        const [profiles, medications, alerts, cart, recipes, purchases] = await Promise.all([
          storage.getProfiles(),
          storage.getMedications(),
          storage.getAlerts(),
          storage.getCart(),
          storage.getRecipes(),
          storage.getPurchases(),
        ]);

        dispatchRaw({
          type: 'SET_DATA_LOADED',
          payload: { profiles, medications, alerts, cart, recipes, purchases },
        });

        logger.info('Initial data loaded', { durationMs: Math.round(performance.now() - t0) });
        track('data_load_time', { duration_ms: Math.round(performance.now() - t0) });
      } catch (error) {
        logger.error('Error fetching initial data from Supabase', error);
        toast.error('Error al cargar tus datos. Por favor recarga la página.');
        dispatchRaw({ type: 'SET_LOADING_DATA', payload: false });
      }
    }

    loadData();
  // userId es un string — solo cambia cuando el usuario real cambia (login/logout)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Apply senior mode to document
  useEffect(() => {
    document.documentElement.setAttribute('data-senior-mode', state.settings.seniorMode ? 'true' : 'false');
  }, [state.settings.seniorMode]);

  // Generate auto alerts on medication changes (no incluir state.alerts en deps para evitar loop)
  useEffect(() => {
    if (state.isLoadingData) return;
    if (state.medications.length === 0) return;

    const activeMeds = state.medications.filter((m) => !m.deleted);
    const autoAlerts = generateAutoAlerts(activeMeds);
    if (autoAlerts.length === 0) return;

    // Snapshot de alertas existentes para comparar sin re-trigger
    const existingTypes = new Set(state.alerts.map((a) => `${a.tipo}_${a.catalogId}`));
    const newAlerts = autoAlerts.filter(
      (a) => !existingTypes.has(`${a.tipo}_${a.catalogId}`)
    );
    if (newAlerts.length === 0) return;

    const merged = [...state.alerts, ...newAlerts.map((a) => ({
      ...a,
      id: crypto.randomUUID(),
      profileId: state.activeProfileId,
      leida: false,
      activa: true,
    }))];
    storage.saveAlerts(merged);
    dispatchRaw({ type: 'SET_ALERTS', payload: merged });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.medications, state.isLoadingData, state.activeProfileId]);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

// ── Hook ─────────────────────────────────────────────────────

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

// ── Selectors ────────────────────────────────────────────────

export function useActiveProfile() {
  const { state } = useApp();
  return state.profiles.find((p) => p.id === state.activeProfileId) || state.profiles[0] || null;
}

export function useActiveMedications() {
  const { state } = useApp();
  return state.medications.filter(
    (m) => m.profileId === state.activeProfileId && !m.deleted
  );
}

export function useActiveAlerts() {
  const { state } = useApp();
  return state.alerts.filter(
    (a) => a.profileId === state.activeProfileId && a.activa
  );
}

export function useIsPremium() {
  const { state } = useApp();
  return state.subscription.plan === 'premium';
}

export function useCanAddProfile() {
  const { state } = useApp();
  if (state.subscription.plan === 'premium') return true;
  return state.profiles.length < 2;
}
