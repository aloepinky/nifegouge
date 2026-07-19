import React, { useEffect, useState } from 'react';

const MAX_PHOTOS = 3;

// UPDATE SUPPORTER COUNT HERE — sets the number under the heart on the button
const SUPPORTER_COUNT = 3;

// The "(N)" in the text is what makes the button API render N under the heart;
// the fetch below hides it from the visible label
const BMC_IMG_URL =
  `https://img.buymeacoffee.com/button-api/?text=Support PSM (${SUPPORTER_COUNT})` +
  '&emoji=&slug=pinksheetmafia' +
  '&button_colour=f8b4b4&font_colour=000000&font_family=Inter&outline_colour=000000&coffee_colour=FFDD00';

function Footer() {
  const [bmcSrc, setBmcSrc] = useState(BMC_IMG_URL);

  // The button is an SVG: fetch it and wrap the "(N)" in an invisible tspan so
  // the label reads "Support PSM" while the heart keeps its count. If the
  // fetch fails, the raw image (with the visible "(N)") is used as-is.
  useEffect(() => {
    fetch(BMC_IMG_URL)
      .then((r) => r.text())
      .then((svg) => {
        const cleaned = svg.replace(
          `(${SUPPORTER_COUNT})`,
          `<tspan opacity="0">(${SUPPORTER_COUNT})</tspan>`
        );
        setBmcSrc('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(cleaned));
      })
      .catch(() => {});
  }, []);
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState('Bug');
  const [description, setDescription] = useState('');
  const [email, setEmail] = useState('');
  const [photos, setPhotos] = useState([]);
  const [status, setStatus] = useState('idle'); // idle | sending | success | error

  const handlePhotos = (e) => {
    setPhotos(Array.from(e.target.files).slice(0, MAX_PHOTOS));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description.trim()) return;
    setStatus('sending');

    const formData = new FormData();
    formData.append('form-name', 'feedback');
    formData.append('category', category);
    formData.append('description', description);
    formData.append('email', email);
    photos.forEach((file, i) => formData.append(`photo${i + 1}`, file));

    try {
      const res = await fetch('/', { method: 'POST', body: formData });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      setStatus('success');
      setDescription('');
      setEmail('');
      setPhotos([]);
      e.target.reset();
    } catch (err) {
      setStatus('error');
    }
  };

  return (
    <footer className="site-footer">
      <div className="footer-feedback">
        <div
          className={`footer-feedback-toggle ${open ? 'open' : ''}`}
          onClick={() => setOpen(!open)}
        >
          <span className="footer-feedback-arrow">{open ? '▾' : '▸'}</span>
          Complaints / Bugs / Feature Requests
        </div>
        {open && (
          status === 'success' ? (
            <p className="footer-feedback-success">
              Thanks — your feedback was sent!{' '}
              <span className="footer-feedback-again" onClick={() => setStatus('idle')}>
                Submit another
              </span>
            </p>
          ) : (
            <form
              name="feedback"
              data-netlify="true"
              netlify-honeypot="bot-field"
              onSubmit={handleSubmit}
            >
              <p className="footer-hidden-field">
                <label>Don't fill this out: <input name="bot-field" /></label>
              </p>
              <div className="footer-form-row">
                <select
                  name="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option>Bug</option>
                  <option>Fix</option>
                  <option>Feature Request</option>
                  <option>Complaint</option>
                </select>
                <input
                  type="email"
                  name="email"
                  placeholder="Your email (optional)"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <textarea
                name="description"
                placeholder="Short description..."
                rows={3}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <div className="footer-form-row">
                <label className="footer-file-label">
                  Attach photos (up to {MAX_PHOTOS})
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotos}
                  />
                </label>
                <button type="submit" disabled={status === 'sending'}>
                  {status === 'sending' ? 'Sending...' : 'Submit'}
                </button>
              </div>
              {photos.length > 0 && (
                <p className="footer-photo-list">
                  {photos.map((f) => f.name).join(', ')}
                </p>
              )}
              {status === 'error' && (
                <p className="footer-feedback-error">
                  Something went wrong — please try again, or email pinksheetmafia@gmail.com directly.
                </p>
              )}
            </form>
          )
        )}
      </div>
      <div className="footer-support">
        <a
          className="footer-bmc"
          href="https://www.buymeacoffee.com/pinksheetmafia"
          target="_blank"
          rel="noopener noreferrer"
        >
          <img src={bmcSrc} alt="Support PSM — Buy Me a Coffee" />
        </a>
      </div>
    </footer>
  );
}

export default Footer;
