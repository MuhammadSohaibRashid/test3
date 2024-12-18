import React, { useState } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LoginPage from './components/LoginPage';
import HomePage from './components/HomePage';
import Clipper from './components/clipper';
import SEO from './components/Seo';

const App = () => {
  // State to store the video URL and thumbnail
  const [videoUrl, setVideoUrl] = useState('');
  const [videoThumbnail, setVideoThumbnail] = useState('');
  const [videoId, setVideoId] = useState('');

  return (
    <GoogleOAuthProvider clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID}>
      <BrowserRouter>
        <Routes>
          {/* Login Page */}
          <Route path="/" element={<LoginPage />} />

          {/* Home Page */}
          <Route
            path="/home"
            element={
              <HomePage
                setVideoUrl={setVideoUrl}
                setVideoThumbnail={setVideoThumbnail}
                setVideoId={setVideoId}
              />
            }
          />

          {/* Clipper Page */}
          <Route
            path="/clipper"
            element={
              <Clipper
                videoUrl={videoUrl}
                setVideoUrl={setVideoUrl}
                videoThumbnail={videoThumbnail}
              />
            }
          />

          {/* SEO Page */}
          <Route
            path="/seo"
            element={
              <SEO
                videoId={videoId}
                videoThumbnail={videoThumbnail}
              />
            }
          />

          {/* Page Not Found */}
          <Route path="*" element={<h2>Page Not Found</h2>} />
        </Routes>
      </BrowserRouter>
    </GoogleOAuthProvider>
  );
};

export default App;
