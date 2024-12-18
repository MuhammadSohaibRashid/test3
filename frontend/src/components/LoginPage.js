// src/components/LoginPage.js
import React from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';
import './LoginPage.css';
import homepageImage from './homepage.png';

const LoginPage = () => {
    const navigate = useNavigate();

    const handleSignup = () => {
        navigate('/home'); // Redirects to the home page
    };

    return (
        <div className="home-container">
            <nav className="navbar">
                <div className="logo">Channel-<span className="highlight">IQ</span></div>
                <div className="nav-links">
                    <a href="#">Clipper</a>
                    <a href="#">SEO</a>
                    <a href="#">Thumbnail</a>
                    <a href="#">Pricing</a>
                    <button className="sign-in-btn" onClick={handleSignup}>Sign In</button>
                </div>
            </nav>

            <div className="login-container">
                <div className="text">
                    <p>Turn your long videos into <span className="highlight-tag">VIRAL</span> short clips.</p>
                </div>          
            </div>

            <div className='googlebutton'>
            <GoogleLogin
                onSuccess={(response) => console.log(response)}
                onError={() => console.log("Login Failed")}
                className="google-login-button"
                 />
            </div>
            
            <div className="video-preview">
          <img src={homepageImage} alt="Video preview" />
            </div>
            
            </div>
    );
};

export default LoginPage;
