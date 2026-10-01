// ============================================================
// CYCLONEGUARD AI
// GOOGLE LOGIN + ROLE SELECTION
// ============================================================

"use strict";


import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";


import {
    getAuth,
    GoogleAuthProvider,
    signInWithPopup,
    signOut
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";


// ============================================================
// FIREBASE CONFIGURATION
// ============================================================

const firebaseConfig = {

    apiKey: "AIzaSyBoTpQMkHFnMkdCdEKwiiS6HDUvst4yzng",

    authDomain:
        "cycloneguard-ai.firebaseapp.com",

    projectId:
        "cycloneguard-ai",

    storageBucket:
        "cycloneguard-ai.firebasestorage.app",

    messagingSenderId:
        "501320960533",

    appId:
        "1:501320960533:web:e0db9eb723c9fd31925c1c"

};


// ============================================================
// INITIALIZE FIREBASE
// ============================================================

const app =
    initializeApp(firebaseConfig);


const auth =
    getAuth(app);


const provider =
    new GoogleAuthProvider();


// ============================================================
// GET HTML ELEMENTS
// ============================================================

const loginSection =
    document.getElementById(
        "loginSection"
    );


const roleSection =
    document.getElementById(
        "roleSection"
    );


const googleLogin =
    document.getElementById(
        "googleLogin"
    );


const loginMessage =
    document.getElementById(
        "loginMessage"
    );


const userName =
    document.getElementById(
        "userName"
    );


const userEmail =
    document.getElementById(
        "userEmail"
    );


const userPhoto =
    document.getElementById(
        "userPhoto"
    );


const logoutButton =
    document.getElementById(
        "logout"
    );


const roleCards =
    document.querySelectorAll(
        ".role-card"
    );


// ============================================================
// GOOGLE LOGIN
// ============================================================

googleLogin.addEventListener(
    "click",
    async () => {

        loginMessage.innerText =
            "Opening Google sign-in...";

        googleLogin.disabled =
            true;


        try {

            // -----------------------------------------------
            // OPEN GOOGLE LOGIN
            // -----------------------------------------------

            const result =
                await signInWithPopup(
                    auth,
                    provider
                );


            // -----------------------------------------------
            // GET USER
            // -----------------------------------------------

            const user =
                result.user;


            console.log(
                "Google login successful."
            );

            console.log(
                "User:",
                user
            );


            // -----------------------------------------------
            // SAVE USER INFORMATION
            // -----------------------------------------------

            sessionStorage.setItem(
                "userEmail",
                user.email || ""
            );


            sessionStorage.setItem(
                "userName",
                user.displayName || "User"
            );


            sessionStorage.setItem(
                "userPhoto",
                user.photoURL || ""
            );


            sessionStorage.setItem(
                "firebaseUid",
                user.uid
            );


            // -----------------------------------------------
            // SHOW ROLE SELECTION
            // -----------------------------------------------

            showRoleSelection(
                user
            );

        }

        catch (error) {

            console.error(
                "Google login error:",
                error
            );


            console.error(
                "Error code:",
                error.code
            );


            console.error(
                "Error message:",
                error.message
            );


            loginMessage.innerText =
                "Login error: " +
                error.code;


            googleLogin.disabled =
                false;

        }

    }
);


// ============================================================
// SHOW ROLE SELECTION
// ============================================================

function showRoleSelection(user) {

    // Hide login

    loginSection.classList.add(
        "hidden"
    );


    // Show role selection

    roleSection.classList.remove(
        "hidden"
    );


    // User name

    userName.innerText =
        user.displayName || "User";


    // User email

    userEmail.innerText =
        user.email || "";


    // User photo

    if (user.photoURL) {

        userPhoto.src =
            user.photoURL;

    }

    else {

        userPhoto.src =
            "https://ui-avatars.com/api/?name=User";

    }

}


// ============================================================
// ROLE SELECTION
// ============================================================

roleCards.forEach(
    card => {

        card.addEventListener(
            "click",
            () => {

                const role =
                    card.dataset.role;


                console.log(
                    "Selected role:",
                    role
                );


                // Save role

                sessionStorage.setItem(
                    "userRole",
                    role
                );


                // -------------------------------------------
                // REDIRECT
                // -------------------------------------------

                if (
                    role === "citizen"
                ) {

                    window.location.href =
                        "citizen.html";

                }


                else if (
                    role === "official"
                ) {

                    window.location.href =
                        "official.html";

                }


                else if (
                    role === "researcher"
                ) {

                    window.location.href =
                        "researcher.html";

                }

            }
        );

    }
);


// ============================================================
// LOGOUT
// ============================================================

logoutButton.addEventListener(
    "click",
    async () => {

        try {

            await signOut(
                auth
            );


            // Clear local session

            sessionStorage.clear();


            // Show login page again

            roleSection.classList.add(
                "hidden"
            );


            loginSection.classList.remove(
                "hidden"
            );


            googleLogin.disabled =
                false;


            loginMessage.innerText =
                "";


            console.log(
                "User signed out."
            );

        }

        catch (error) {

            console.error(
                "Logout error:",
                error
            );

        }

    }
);


// ============================================================
// CURRENT YEAR
// ============================================================

const currentYear =
    document.getElementById(
        "currentYear"
    );


if (currentYear) {

    currentYear.innerText =
        new Date().getFullYear();

}


// ============================================================
// CHECK EXISTING SESSION
// ============================================================

const existingEmail =
    sessionStorage.getItem(
        "userEmail"
    );


const existingName =
    sessionStorage.getItem(
        "userName"
    );


const existingPhoto =
    sessionStorage.getItem(
        "userPhoto"
    );


if (
    existingEmail &&
    existingName
) {

    // The user previously logged in.
    // Show role selection again.

    loginSection.classList.add(
        "hidden"
    );


    roleSection.classList.remove(
        "hidden"
    );


    userName.innerText =
        existingName;


    userEmail.innerText =
        existingEmail;


    if (existingPhoto) {

        userPhoto.src =
            existingPhoto;

    }

}