import React from 'react';

const PDF = '/Metars, Tafs, and station model.pdf';

// The METAR, TAF and station-model figures the weather questions refer to.
export default function WeatherFigures({ onClose }) {
  const download = () => {
    const link = document.createElement('a');
    link.href = PDF;
    link.download = 'Weather_Figures.pdf';
    link.click();
  };

  return (
    <div className="modal" onClick={(e) => e.target.className === 'modal' && onClose()}>
      <div className="modal-content" style={{ maxWidth: '95%', width: 'auto', height: '90vh', margin: '2.5vh auto', padding: '10px' }}>
        <span className="close-button" onClick={onClose}>&times;</span>
        <h2 style={{ marginBottom: '20px', textAlign: 'center' }}>Weather Figures</h2>

        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <button onClick={download}>Download PDF</button>
        </div>

        <div style={{ width: '100%', height: 'calc(90vh - 120px)' }}>
          <iframe src={PDF} title="Weather Figures PDF" style={{ width: '100%', height: '100%', border: 'none' }}>
            <p>
              Your browser does not support PDFs.{' '}
              <a href={PDF} target="_blank" rel="noopener noreferrer">Click here to download the PDF</a>
            </p>
          </iframe>
        </div>
      </div>
    </div>
  );
}
