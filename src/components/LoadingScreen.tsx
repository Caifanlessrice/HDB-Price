interface LoadingScreenProps {
  progress: string;
  error: string | null;
}

export function LoadingScreen({ progress, error }: LoadingScreenProps) {
  return (
    <div className="loading-overlay">
      <div className="loader">
        {error ? (
          <>
            <div className="loader-error">!</div>
            <p className="loader-error-text">{error}</p>
            <button
              className="btn-primary"
              onClick={() => window.location.reload()}
            >
              Retry
            </button>
          </>
        ) : (
          <>
            <div className="loader-ring" />
            <p className="loader-label">Loading HDB Resale Data</p>
            <p className="loader-sub">{progress}</p>
          </>
        )}
      </div>
    </div>
  );
}
