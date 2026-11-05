// ==UserScript==
// @name         5-Star Batch Off Campus Sign-Up
// @namespace    http://tampermonkey.net/
// @version      3.3
// @description  Automates daily Off Campus Lunch sign-ups
// @match        *://*/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    const SLEEP_MS = 400;
    const helper = (ms) => new Promise(res => setTimeout(res, ms));

    // --- CASE 1: INDIVIDUAL SESSION PAGE ---
    if (window.location.pathname.includes('/signups/sessions/')) {
        if (sessionStorage.getItem('auto_signup_active') === 'true') {
            runSinglePageSignUp();
        }
        return;
    }

    // --- CASE 2: MAIN DASHBOARD LIST PAGE ---
    const btn = document.createElement('button');
    btn.id = 'batch-lunch-btn';
    btn.innerText = '⚡ Auto Sign-Up All Days';

    Object.assign(btn.style, {
        position: 'fixed',
        bottom: '30px',
        right: '30px',
        zIndex: '2147483647',
        padding: '14px 22px',
        backgroundColor: '#1e88e5',
        color: '#ffffff',
        border: 'none',
        borderRadius: '8px',
        boxShadow: '0 4px 14px rgba(0,0,0,0.3)',
        fontSize: '15px',
        fontWeight: 'bold',
        cursor: 'pointer'
    });

    btn.addEventListener('click', async () => {
        const viewLinks = Array.from(document.querySelectorAll('a[href*="/signups/sessions/"]'));

        if (viewLinks.length === 0) {
            alert('No "View" session links found on this page.');
            return;
        }

        btn.disabled = true;
        btn.innerText = `⏳ Processing 0/${viewLinks.length}...`;
        btn.style.backgroundColor = '#757575';

        const queue = viewLinks.map(link => link.href);
        sessionStorage.setItem('signup_queue', JSON.stringify(queue));
        sessionStorage.setItem('signup_total', queue.length);
        sessionStorage.setItem('auto_signup_active', 'true');

        processNextInQueue();
    });

    // Continuous polling loop ensures element presence
    setInterval(() => {
        if (document.body && !document.getElementById('batch-lunch-btn')) {
            document.body.appendChild(btn);
        }
    }, 500);

    // Resume queue processing if returning to main page
    if (sessionStorage.getItem('auto_signup_active') === 'true') {
        processNextInQueue();
    }

    async function processNextInQueue() {
        const queue = JSON.parse(sessionStorage.getItem('signup_queue') || '[]');
        const total = sessionStorage.getItem('signup_total') || '0';

        if (queue.length === 0) {
            sessionStorage.removeItem('auto_signup_active');
            sessionStorage.removeItem('signup_queue');
            sessionStorage.removeItem('signup_total');

            btn.innerText = '✓ All Days Completed!';
            btn.style.backgroundColor = '#2e7d32';
            setTimeout(() => {
                btn.disabled = false;
                btn.innerText = '⚡ Auto Sign-Up All Days';
                btn.style.backgroundColor = '#1e88e5';
            }, 3000);
            return;
        }

        const nextUrl = queue.shift();
        sessionStorage.setItem('signup_queue', JSON.stringify(queue));

        const currentNum = total - queue.length;
        btn.innerText = `⏳ Processing ${currentNum}/${total}...`;

        window.location.href = nextUrl;
    }

    async function runSinglePageSignUp() {
        await helper(500);

        // Find all sign-up buttons on the page
        const signUpBtns = Array.from(document.querySelectorAll('button[data-bs-target="#confirmSessionSignUpModal"]'));

        let targetBtn = null;

        // 1. Check data attribute directly
        targetBtn = signUpBtns.find(
            b => b.getAttribute('data-bs-name')?.toLowerCase().includes('off campus')
        );

        // 2. Fallback: Inspect the surrounding text container for "Off Campus Lunch"
        if (!targetBtn) {
            targetBtn = signUpBtns.find(b => {
                const container = b.closest('div, tr, li') || b.parentElement;
                return container && container.textContent.toLowerCase().includes('off campus lunch');
            });
        }

        if (targetBtn) {
            targetBtn.click();
            await helper(SLEEP_MS);

            // Click the popup modal confirm button
            const confirmBtn = document.querySelector('.button-confirm, a.button-confirm');
            if (confirmBtn) {
                confirmBtn.click();
                await helper(600);
            }
        }

        // Return via "My Sign Ups" link or fallback URL
        const mySignUpsBtn = Array.from(document.querySelectorAll('a, button')).find(
            el => el.textContent.trim().toLowerCase().includes('my sign ups')
        );

        if (mySignUpsBtn) {
            mySignUpsBtn.click();
        } else {
            window.location.href = 'https://5starstudents.com/mhhs/dashboard/ad0fb14b0c0e43fe98e93fbe1a64172d/signups#sessions';
        }
    }
})();