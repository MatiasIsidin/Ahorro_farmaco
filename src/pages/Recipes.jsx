// ============================================================
// RECIPES — Recetas y Documentos (Production-Grade)
// ============================================================

import { useState, useRef } from 'react';
import { FileText, Upload, Calendar, AlertTriangle, Eye, Trash2, ShieldCheck, Download, Loader, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getRecipeSignedUrl } from '../services/storageService';
import { track } from '../lib/analytics';
import './Recipes.css';

export default function Recipes() {
  const { state, dispatch } = useApp();
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null); // { type: 'success'|'error', message }
  const [loadingAction, setLoadingAction] = useState(null); // recipe.id while loading
  
  const profileRecipes = state.recipes.filter(r => r.profileId === state.activeProfileId);

  const isExpiringSoon = (expirationDate) => {
    const days = (new Date(expirationDate) - new Date()) / (1000 * 60 * 60 * 24);
    return days > 0 && days <= 30; // Expires in <= 30 days
  };

  const isExpired = (expirationDate) => {
    return new Date(expirationDate) < new Date();
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!state.activeProfileId) {
      setUploadStatus({ type: 'error', message: 'Selecciona un perfil antes de subir una receta.' });
      return;
    }

    setUploading(true);
    setUploadStatus(null);
    track('recipe_upload_started');
    try {
      await dispatch({
        type: 'ADD_RECIPE',
        payload: {
          profileId: state.activeProfileId,
          file: file,
          medico: 'Médico (Ingresado vía documento)',
          fechaEmision: new Date().toISOString(),
          fechaExpiracion: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
        }
      });
      track('recipe_upload_success');
      setUploadStatus({ type: 'success', message: '✅ Receta subida correctamente.' });
    } catch (err) {
      track('recipe_upload_error');
      setUploadStatus({ type: 'error', message: '❌ Error al subir la receta. Intenta de nuevo.' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = (id) => {
    if(window.confirm('¿Eliminar esta receta? Esta acción no se puede deshacer.')) {
      dispatch({ type: 'DELETE_RECIPE', payload: id });
    }
  };

  const handleAction = async (recipe, action) => {
    if (!recipe.imagen) {
      setUploadStatus({ type: 'error', message: 'No hay archivo asociado a esta receta.' });
      return;
    }

    setLoadingAction(recipe.id);
    try {
      track('signed_url_generated');
      const signedUrl = await getRecipeSignedUrl(recipe.imagen);

      if (!signedUrl) {
        track('signed_url_error');
        setUploadStatus({ type: 'error', message: 'El archivo no existe o no tienes permisos para acceder a él.' });
        return;
      }

      if (action === 'view') {
        track('recipe_viewed');
        window.open(signedUrl, '_blank', 'noopener,noreferrer');
      } else if (action === 'download') {
        track('recipe_downloaded');
        const a = document.createElement('a');
        a.href = signedUrl;
        a.download = recipe.nombreArchivo || 'receta.pdf';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch (err) {
      setUploadStatus({ type: 'error', message: 'Ocurrió un error inesperado al acceder a la receta.' });
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="recipes-page animate-fade-in">
      <div className="recipes-header">
        <div>
          <h2 className="recipes-title">Recetas y Documentos</h2>
          <p className="text-secondary">Centraliza tus prescripciones para compras más rápidas.</p>
        </div>
        <div>
          <input 
            type="file" 
            ref={fileInputRef} 
            className="sr-only" 
            onChange={handleUpload} 
            accept="image/*,application/pdf"
          />
          <button 
            className="btn btn-primary" 
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <><Loader className="animate-spin" size={18} /> Subiendo...</>
            ) : (
              <><Upload size={18} /> Subir Documento</>
            )}
          </button>
        </div>
      </div>

      {/* Upload status banner */}
      {uploadStatus && (
        <div className={`recipes-status-banner ${uploadStatus.type === 'success' ? 'status-success' : 'status-error'}`}>
          <span>{uploadStatus.message}</span>
          <button className="btn-icon-sm" onClick={() => setUploadStatus(null)} aria-label="Cerrar">
            <X size={16} />
          </button>
        </div>
      )}

      <div className="recipes-list stagger-children mt-6">
        {profileRecipes.length > 0 ? (
          profileRecipes.map(recipe => {
            const expired = isExpired(recipe.fechaExpiracion);
            const expiring = !expired && isExpiringSoon(recipe.fechaExpiracion);
            const isLoading = loadingAction === recipe.id;

            return (
              <div key={recipe.id} className="card recipe-card">
                <div className="recipe-card-header">
                  <div className="flex items-center gap-3">
                    <div className="recipe-icon">
                      <FileText className="text-primary" size={24} />
                    </div>
                    <div>
                      <h4 className="font-bold">{recipe.nombreArchivo}</h4>
                      <span className="text-sm text-secondary">
                        Emitida: {new Date(recipe.fechaEmision).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  {expired ? (
                    <span className="badge badge-danger">Vencida</span>
                  ) : expiring ? (
                    <span className="badge badge-warning">Por vencer</span>
                  ) : (
                    <span className="badge badge-success">Vigente</span>
                  )}
                </div>

                <div className="recipe-card-body">
                  <div className="recipe-info-grid">
                    <div className="recipe-info-item">
                      <ShieldCheck size={16} className="text-muted" />
                      <div>
                        <span className="block text-xs text-secondary uppercase">Médico</span>
                        <strong>{recipe.medico}</strong>
                      </div>
                    </div>
                    <div className="recipe-info-item">
                      <Calendar size={16} className="text-muted" />
                      <div>
                        <span className="block text-xs text-secondary uppercase">Expiración</span>
                        <strong className={expired ? 'text-danger' : expiring ? 'text-warning' : ''}>
                          {new Date(recipe.fechaExpiracion).toLocaleDateString()}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {recipe.medicamentosAsociados && recipe.medicamentosAsociados.length > 0 && (
                    <div className="mt-4">
                      <span className="block text-xs text-secondary uppercase mb-1">Medicamentos prescritos</span>
                      <div className="flex flex-wrap gap-2">
                        {recipe.medicamentosAsociados.map((m, i) => (
                          <span key={i} className="badge badge-info bg-primary-50 text-primary-800 border-none">{m}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="recipe-card-actions">
                  <button className="btn btn-ghost text-danger btn-sm" onClick={() => handleDelete(recipe.id)}>
                    <Trash2 size={16} /> Eliminar
                  </button>
                  <div className="flex gap-2">
                    <button 
                      className="btn btn-ghost btn-sm" 
                      onClick={() => handleAction(recipe, 'view')}
                      disabled={isLoading}
                    >
                      {isLoading ? <Loader className="animate-spin" size={16} /> : <Eye size={16} />} Ver
                    </button>
                    <button 
                      className="btn btn-secondary btn-sm" 
                      onClick={() => handleAction(recipe, 'download')}
                      disabled={isLoading}
                    >
                      {isLoading ? <Loader className="animate-spin" size={16} /> : <Download size={16} />} Descargar
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="empty-state">
            <span className="empty-state-icon">📄</span>
            <h3>No hay recetas guardadas</h3>
            <p>Sube tus documentos médicos para tenerlos siempre a mano en la farmacia.</p>
            <button className="btn btn-secondary mt-4" onClick={() => fileInputRef.current?.click()}>
              Subir mi primera receta
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
