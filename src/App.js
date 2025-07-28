import React, { useState, useRef, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';

// --- API URL base (change if needed) ---
const API_URL = 'http://localhost:8080/api';

const shapeTemplates = {
  square: { type: 'square', width: 60, height: 60, color: '#007bff' },
  circle: { type: 'circle', width: 60, height: 60, color: '#28a745' },
  triangle: { type: 'triangle', width: 60, height: 60, color: '#ffc107' },
};

function PaintingApp() {
  // User state
  const [user, setUser] = useState(null); // will be username if logged in
  const [authMode, setAuthMode] = useState('login'); // or 'signup'
  const [authInfo, setAuthInfo] = useState({ username: '' }); // Only username needed
  const [authError, setAuthError] = useState('');

  // Painting state
  const [paintingName, setPaintingName] = useState('My Painting');
  const [isEditingName, setIsEditingName] = useState(false);
  const [shapes, setShapes] = useState([]);
  const [userPaintings, setUserPaintings] = useState([]);
  const [selectedPaintingId, setSelectedPaintingId] = useState(null);

  // Drag state
  const [draggedShape, setDraggedShape] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // UI refs
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  // --- Authentication handlers ---
  const handleAuthChange = (e) => {
    setAuthInfo({ ...authInfo, [e.target.name]: e.target.value });
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');

    if (!authInfo.username.trim()) {
      setAuthError('Username is required');
      return;
    }

    try {
      if (authMode === 'signup') {
        // For signup - only send username
        const res = await fetch(API_URL + `/users/signup/${encodeURIComponent(authInfo.username.trim())}`, {
          method: 'GET',
          // headers: { 'Content-Type': 'application/json' },
          // body: JSON.stringify({ username: authInfo.username.trim() }),
          credentials: 'include'
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || 'Signup failed');
        }

        const data = await res.json();
        setUser(authInfo.username.trim());
        setAuthInfo({ username: '' });
        fetchUserPaintings(authInfo.username.trim());

      } else {
        // For login - check if user exists
        const res = await fetch(API_URL + `/users/check/${encodeURIComponent(authInfo.username.trim())}`, {
          method: 'GET',
          credentials: 'include'
        });

        if (!res.ok) {
          throw new Error('Login failed');
        }

        const data = await res.json();
        if (data.exists) {
          setUser(authInfo.username.trim());
          setAuthInfo({ username: '' });
          fetchUserPaintings(authInfo.username.trim());
        } else {
          throw new Error('User does not exist');
        }
      }
    } catch (ex) {
      setAuthError(ex.message);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setShapes([]);
    setPaintingName('My Painting');
    setUserPaintings([]);
    setSelectedPaintingId(null);
  };

  // --- Backend Painting API ---
  // Save
  const handleSave = async () => {
    if (!user) return;
    const paintingData = {
      name: paintingName,
      shapes,
      owner: user,
      timestamp: new Date(),
      version: 1
    };
    // Save new painting or update (PUT if selectedPaintingId exists)
    const method = selectedPaintingId ? 'PUT' : 'POST';
    const url = selectedPaintingId
        ? `/paintings/${selectedPaintingId}/user/${encodeURIComponent(user)}`
        : `/paintings/user/${encodeURIComponent(user)}`;

    try {
      const res = await fetch(API_URL + url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paintingData),
        credentials: 'include'
      });

      if (!res.ok) {
        throw new Error('Failed to save painting');
      }

      fetchUserPaintings(user); // refresh list
      alert('Painting saved!');
    } catch (error) {
      alert('Error saving painting: ' + error.message);
    }
  };

  // Load all user's paintings
  const fetchUserPaintings = async (theUser = user) => {
    if (!theUser) return;
    try {
      const res = await fetch(
          API_URL + `/paintings/user/${encodeURIComponent(theUser)}`,
          { credentials: 'include' }
      );
      if (res.ok) {
        setUserPaintings(await res.json());
      }
    } catch (error) {
      console.error('Error fetching paintings:', error);
    }
  };

  useEffect(() => {
    if (user) fetchUserPaintings();
  }, [user]);

  // Load specific painting from backend
  const handleLoadPainting = async (id) => {
    try {
      const res = await fetch(API_URL + `/paintings/${id}/user/${encodeURIComponent(user)}`, {
        credentials: 'include'
      });
      if (!res.ok) {
        throw new Error('Failed to load painting');
      }
      const paintingData = await res.json();
      setPaintingName(paintingData.name);
      setShapes(paintingData.shapes || []);
      setSelectedPaintingId(id);
    } catch (error) {
      alert('Error loading painting: ' + error.message);
    }
  };

  // --- Canvas: drag and drop ---
  const handleDragStart = (type) => (e) => {
    setDraggedShape({ ...shapeTemplates[type] });
  };

  const handleCanvasDrop = (e) => {
    if (!draggedShape) return;
    const canvasRect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - canvasRect.left - 30;
    const y = e.clientY - canvasRect.top - 30;
    setShapes([...shapes, { ...draggedShape, x, y, id: Date.now() }]);
    setDraggedShape(null);
  };

  const handleDragOver = (e) => e.preventDefault();

  // --- Clear canvas ---
  const handleClearCanvas = () => {
    setShapes([]);
    setSelectedPaintingId(null);
    setPaintingName('My Painting');
  };

  // --- Painting title editing ---
  const handleTitleClick = () => setIsEditingName(true);
  const handleTitleChange = (e) => setPaintingName(e.target.value);
  const handleTitleSubmit = () => setIsEditingName(false);

  // --- Render ---
  if (!user) {
    return (
        <div className="container mt-5" style={{ maxWidth: 400 }}>
          <h2 className="mb-3 text-center">
            {authMode === 'signup' ? 'Sign Up' : 'Log In'}
          </h2>
          <form onSubmit={handleAuth}>
            <input
                className="form-control mb-3"
                name="username"
                value={authInfo.username}
                onChange={handleAuthChange}
                placeholder="Enter username"
                required
            />
            <button className="btn btn-primary w-100 mb-2" type="submit">
              {authMode === 'signup' ? 'Sign Up' : 'Log In'}
            </button>
            {authError && (
                <div className="alert alert-danger py-2">{authError}</div>
            )}
          </form>
          {/*<div className="mt-3 text-center">*/}
          {/*  {authMode === 'login' ? (*/}
          {/*      // <>*/}
          {/*      //   Don't have an account?{' '}*/}
          {/*      //   <button*/}
          {/*      //       className="btn btn-link p-0"*/}
          {/*      //       onClick={() => {*/}
          {/*      //         setAuthMode('signup');*/}
          {/*      //         setAuthError('');*/}
          {/*      //       }}>*/}
          {/*      //     Sign up*/}
          {/*      //   </button>*/}
          {/*      // </>*/}
          {/*  ) : (*/}
          {/*      <>*/}
          {/*        Already have an account?{' '}*/}
          {/*        <button*/}
          {/*            className="btn btn-link p-0"*/}
          {/*            onClick={() => {*/}
          {/*              setAuthMode('login');*/}
          {/*              setAuthError('');*/}
          {/*            }}>*/}
          {/*          Log in*/}
          {/*        </button>*/}
          {/*      </>*/}
          {/*  )}*/}
          {/*</div>*/}
        </div>
    );
  }

  // --- Main app UI when logged in ---
  return (
      <div className="container py-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div>
            <span className="me-4">Logged in as: <b>{user}</b></span>
            <button className="btn btn-sm btn-secondary" onClick={handleLogout}>
              Log out
            </button>
          </div>
          <div className="d-flex align-items-center">
            <button
                className="btn btn-outline-secondary me-2"
                onClick={handleClearCanvas}>
              New Painting
            </button>
            <button
                className="btn btn-outline-primary me-2"
                onClick={() => fetchUserPaintings()}>
              Refresh
            </button>
            <button className="btn btn-success" onClick={handleSave}>
              Save Painting
            </button>
          </div>
        </div>

        <h2 onClick={handleTitleClick} style={{ cursor: 'pointer' }}>
          {isEditingName ? (
              <input
                  value={paintingName}
                  onBlur={handleTitleSubmit}
                  onChange={handleTitleChange}
                  onKeyDown={e => e.key === 'Enter' && handleTitleSubmit()}
                  autoFocus
                  style={{ fontSize: '1.5rem' }}
                  className="form-control"
              />
          ) : (
              <span className="text-primary">{paintingName}</span>
          )}
        </h2>

        {/* Paintings list */}
        {userPaintings.length > 0 && (
            <div className="mb-3">
              <strong>My Paintings: </strong>
              {userPaintings.map((p) => (
                  <button
                      key={p.id}
                      className={`btn btn-sm mx-1 ${
                          selectedPaintingId === p.id
                              ? 'btn-primary'
                              : 'btn-outline-primary'
                      }`}
                      onClick={() => handleLoadPainting(p.id)}>
                    {p.name}
                  </button>
              ))}
            </div>
        )}

        <div className="row">
          {/* Sidebar for shape tools */}
          <div className="col-md-2">
            <div className="mb-3">
              <strong>Shape Tools</strong>
              <div className="mt-2">
                {Object.keys(shapeTemplates).map((type) => (
                    <div
                        key={type}
                        className="mb-2 d-flex align-items-center justify-content-center"
                        draggable
                        onDragStart={handleDragStart(type)}
                        style={{
                          cursor: 'grab',
                          width: 50, height: 50,
                          // border: '2px solid #ddd',
                          background: shapeTemplates[type].color,
                          borderRadius: type === 'circle' ? '50%' : '4px',
                          clipPath: type === 'triangle'
                              ? 'polygon(50% 10%, 10% 90%, 90% 90%)'
                              : 'none'
                        }}
                        title={`Drag ${type} to canvas`}
                    />
                ))}
                <div className="mt-2">
                  <small className="text-muted">
                    Drag shapes to the canvas
                  </small>
                </div>
              </div>
            </div>
          </div>

          {/* Canvas */}
          <div className="col-md-10">
            <div
                ref={canvasRef}
                onDragOver={handleDragOver}
                onDrop={handleCanvasDrop}
                style={{
                  position: 'relative',
                  height: 500,
                  border: '2px solid #444',
                  background: '#f8f9fa',
                  borderRadius: '8px'
                }}>
              {shapes.length === 0 && (
                  <div
                      className="d-flex align-items-center justify-content-center h-100 text-muted"
                      style={{ fontSize: '1.2rem' }}>
                    Drag shapes from the sidebar to start painting!
                  </div>
              )}
              {shapes.map((s, idx) => (
                  <div
                      key={s.id || idx}
                      style={{
                        position: 'absolute',
                        left: s.x, top: s.y,
                        width: s.width, height: s.height,
                        background: s.color,
                        borderRadius: s.type === 'circle' ? '50%' : '4px',
                        clipPath: s.type === 'triangle'
                            ? 'polygon(50% 10%, 10% 90%, 90% 90%)'
                            : 'none',
                        //border: '2px solid #333',
                        cursor: 'move',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                      }}
                      title={`${s.type} shape`}
                  />
              ))}
            </div>
          </div>
        </div>
      </div>
  );
}

export default PaintingApp;
