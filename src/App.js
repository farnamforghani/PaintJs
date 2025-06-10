import React from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import { useState, useRef } from 'react';

const PaintingApp = () => {
  const [shapes, setShapes] = useState([]);
  const [draggedShape, setDraggedShape] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [paintingName, setPaintingName] = useState('My Painting');
  const [isEditingName, setIsEditingName] = useState(false);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const nameInputRef = useRef(null);

  const shapeTemplates = {
    square: { type: 'square', width: 60, height: 60, color: '#007bff' },
    circle: { type: 'circle', width: 60, height: 60, color: '#dc3545' },
    triangle: { type: 'triangle', width: 60, height: 60, color: '#28a745' }
  };

  const handleDragStart = (e, shapeType) => {
    setDraggedShape(shapeType);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleCanvasDrop = (e) => {
    e.preventDefault();
    if (!draggedShape) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - 30;
    const y = e.clientY - rect.top - 30;
    const newShape = {
      ...shapeTemplates[draggedShape],
      id: Date.now() + Math.random(),
      x,
      y
    };
    setShapes(prev => [...prev, newShape]);
    setDraggedShape(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleShapeMouseDown = (e, shape) => {
    e.preventDefault();
    const rect = canvasRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left - shape.x,
      y: e.clientY - rect.top - shape.y
    });
    setDraggedShape(shape.id);
  };

  const handleCanvasMouseMove = (e) => {
    if (draggedShape && typeof draggedShape === 'number') {
      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left - dragOffset.x;
      const y = e.clientY - rect.top - dragOffset.y;
      setShapes(prev =>
          prev.map(shape =>
              shape.id === draggedShape ? { ...shape, x, y } : shape
          )
      );
    }
  };

  const handleMouseUp = () => {
    setDraggedShape(null);
    setDragOffset({ x: 0, y: 0 });
  };

  const handleShapeDoubleClick = (shapeId) => {
    setShapes(prev => prev.filter(shape => shape.id !== shapeId));
  };

  const handleTitleClick = () => {
    setIsEditingName(true);
    setTimeout(() => nameInputRef.current?.focus(), 0);
  };

  const handleTitleChange = (e) => {
    setPaintingName(e.target.value);
  };

  const handleTitleSubmit = () => {
    if (paintingName.trim() === '') {
      setPaintingName('My Painting');
    }
    setIsEditingName(false);
  };

  const handleTitleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleTitleSubmit();
    }
  };

  const shapeCounts = shapes.reduce((acc, shape) => {
    acc[shape.type] = (acc[shape.type] || 0) + 1;
    return acc;
  }, {});

  const handleExport = () => {
    const paintingData = {
      name: paintingName,
      shapes: shapes,
      timestamp: new Date().toISOString(),
      version: '1.0'
    };
    const dataStr = JSON.stringify(paintingData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const sanitizedName = paintingName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const filename = `${sanitizedName}_${Date.now()}.json`;
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = filename;
    link.click();
  };

  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/json') {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const paintingData = JSON.parse(event.target.result);
          if (paintingData.shapes && Array.isArray(paintingData.shapes)) {
            setShapes(paintingData.shapes);

            if (paintingData.name) {
              setPaintingName(paintingData.name);
            }
          } else {
            alert('Invalid painting file format');
          }
        } catch (error) {
          alert('Error reading file: ' + error.message);
        }
      };
      reader.readAsText(file);
    } else {
      alert('Please select a valid JSON file');
    }
    e.target.value = '';
  };

  const renderShape = (shape) => {
    const commonProps = {
      key: shape.id,
      onMouseDown: (e) => handleShapeMouseDown(e, shape),
      onDoubleClick: () => handleShapeDoubleClick(shape.id),
      style: {
        position: 'absolute',
        left: shape.x,
        top: shape.y,
        width: shape.width,
        height: shape.height,
        backgroundColor: shape.color,
        cursor: 'move',
        userSelect: 'none'
      }
    };

    switch (shape.type) {
      case 'square':
        return <div {...commonProps} />;
      case 'circle':
        return <div {...commonProps} style={{ ...commonProps.style, borderRadius: '50%' }} />;
      case 'triangle':
        return (
            <div
                {...commonProps}
                style={{
                  ...commonProps.style,
                  backgroundColor: 'transparent',
                  width: 0,
                  height: 0,
                  borderLeft: `${shape.width / 2}px solid transparent`,
                  borderRight: `${shape.width / 2}px solid transparent`,
                  borderBottom: `${shape.height}px solid ${shape.color}`
                }}
            />
        );
      default:
        return null;
    }
  };

  return (
      <>
        <div className="vh-100 d-flex flex-column bg-light">
          <header className="bg-light shadow-sm border-bottom">
            <div className="container-fluid px-4 py-3">
              <div className="row align-items-center">
                <div className="col">
                  {isEditingName ? (
                      <input
                          ref={nameInputRef}
                          type="text"
                          value={paintingName}
                          onChange={handleTitleChange}
                          onBlur={handleTitleSubmit}
                          onKeyPress={handleTitleKeyPress}
                          className="form-control form-control-lg fw-bold border-0 px-0"
                          style={{ fontSize: '1.5rem' }}
                      />
                  ) : (
                      <h1
                          className="h2 mb-0 text-dark fw-bold"
                          onClick={handleTitleClick}
                          style={{ cursor: 'pointer' }}
                          title="Click to edit painting name"
                      >
                        {paintingName}
                      </h1>
                  )}
                </div>
                <div className="col-auto">
                  <div className="btn-group">
                    <button
                        onClick={handleImport}
                        className="btn btn-primary me-2"
                    >
                      Import
                    </button>
                    <button
                        onClick={handleExport}
                        className="btn btn-success"
                    >
                      Export
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </header>

          <div className="row flex-fill g-0">
            <aside
                className="col-auto bg-white border-end shadow-sm d-flex flex-column align-items-center py-4"
                style={{ width: '80px' }}
            >
              <div className="small fw-medium text-muted mb-3">Tools</div>
              <div
                  draggable
                  onDragStart={(e) => handleDragStart(e, 'square')}
                  className="mb-3"
                  style={{
                    width: '48px',
                    height: '48px',
                    backgroundColor: '#007bff',
                    cursor: 'grab'
                  }}
                  title="Square"
                  onMouseEnter={e => e.target.style.backgroundColor = '#0056b3'}
                  onMouseLeave={e => e.target.style.backgroundColor = '#007bff'}
              />
              <div
                  draggable
                  onDragStart={(e) => handleDragStart(e, 'circle')}
                  className="mb-3 rounded-circle"
                  style={{
                    width: '48px',
                    height: '48px',
                    backgroundColor: '#dc3545',
                    cursor: 'grab'
                  }}
                  title="Circle"
                  onMouseEnter={e => e.target.style.backgroundColor = '#b02a37'}
                  onMouseLeave={e => e.target.style.backgroundColor = '#dc3545'}
              />
              <div
                  draggable
                  onDragStart={(e) => handleDragStart(e, 'triangle')}
                  style={{
                    width: 0,
                    height: 0,
                    borderLeft: '24px solid transparent',
                    borderRight: '24px solid transparent',
                    borderBottom: '48px solid #28a745',
                    cursor: 'grab'
                  }}
                  title="Triangle"
                  onMouseEnter={e => e.target.style.opacity = '0.8'}
                  onMouseLeave={e => e.target.style.opacity = '1'}
              />
            </aside>

            <main className="col position-relative overflow-hidden">
              <div
                  ref={canvasRef}
                  className="w-100 h-100 bg-white position-relative"
                  style={{ minHeight: '400px' }}
                  onDrop={handleCanvasDrop}
                  onDragOver={handleDragOver}
                  onMouseMove={handleCanvasMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
              >
                {shapes.map(renderShape)}

                {shapes.length === 0 && (
                    <div className="position-absolute top-50 start-50 translate-middle text-muted fs-5" style={{ pointerEvents: 'none' }}>
                      Drag shapes from the sidebar to start painting
                    </div>
                )}
              </div>
            </main>
          </div>

          <footer className="bg-white border-top">
            <div className="container-fluid px-4 py-2">
              <div className="row align-items-center">
                <div className="col-auto">
                  <span className="small fw-medium text-muted">Shape Count:</span>
                </div>
                <div className="col d-flex gap-4">
                <span className="small d-flex align-items-center">
                  <div
                      className="me-2"
                      style={{
                        width: '12px',
                        height: '12px',
                        backgroundColor: '#007bff'
                      }}
                  ></div>
                  Square: {shapeCounts.square || 0}
                </span>
                  <span className="small d-flex align-items-center">
                  <div
                      className="me-2 rounded-circle"
                      style={{
                        width: '12px',
                        height: '12px',
                        backgroundColor: '#dc3545'
                      }}
                  ></div>
                  Circle: {shapeCounts.circle || 0}
                </span>
                  <span className="small d-flex align-items-center">
                  <div
                      className="me-2"
                      style={{
                        width: 0,
                        height: 0,
                        borderLeft: '6px solid transparent',
                        borderRight: '6px solid transparent',
                        borderBottom: '12px solid #28a745'
                      }}
                  ></div>
                  Triangle: {shapeCounts.triangle || 0}
                </span>
                </div>
              </div>
            </div>
          </footer>

          <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileChange}
              className="d-none"
          />
        </div>
      </>
  );
};

export default PaintingApp;