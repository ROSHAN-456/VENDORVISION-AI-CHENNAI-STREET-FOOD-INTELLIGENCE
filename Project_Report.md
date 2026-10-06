# VendorVision AI - Project Report

## 1. Project Overview & Tech Stack
* **Project Name:** VendorVision AI - Chennai Street Food Intelligence
* **Core Goal:** Real-time crowd prediction and demand forecasting for street food stalls using AI to help customers save time and vendors manage stock.
* **Tech Stack:**
  * **Frontend:** React.js, Vite, Tailwind CSS (Custom "Chennai-inspired" aesthetic design system).
  * **Backend:** Python FastAPI, SQLite (Database).
  * **AI/ML Models:** Random Forest Regressors/Classifiers trained on historical footfall, time, and weather data.

## 2. Core AI & Backend Features
* **Live Predictive Engine:** AI successfully forecasts wait times (minutes) and crowd levels (Low/Medium/High) based on the time of day and weather.
* **Authentication System:** Secure email/password login and Role-Based Access Control (RBAC). 
* **Automated Email Alerts:** A built-in SMTP engine (`send_email`) that automatically emails vendors to warn them of upcoming peak crowds so they can prep stock.
* **Live Check-in Loop:** User check-ins instantly write to the database and update the live dashboard data dynamically.

## 3. Customer Platform (Done)
* **Smart Discovery:** Customers can browse stalls with live "AI Forecast" badges predicting the current wait time.
* **Interactive Map:** A visual map plotting real stall coordinates around Chennai.
* **One-Tap Check-in:** Customers currently at a stall can "Check in" to report real-world crowd levels, which actively trains the system and updates vendors.

## 4. Vendor Platform (Done)
* **Live Dashboard:** Vendors can monitor footfall predictions and see exactly when their "Peak Hour" will hit today.
* **Weather Impact Analytics:** Dedicated "Weekly Rain Impact" charts showing vendors exactly which days their sales drop the most due to weather.
* **Real-time Customer Reports:** Vendors can see exactly how many customers have checked in over the last hour versus the AI's prediction.

## 5. Polish & UI/UX (Done)
* **Premium Landing Page:** A polished, fully animated, responsive home page featuring a "How it Works" timeline and direct Demo Login access.
* **Custom Design System:** Moved away from generic templates to a custom color palette (Leaf green, Saffron, Chili red) that fits the food-tech theme.
* **Demo Mode:** Built-in 1-click demo logins for Judges/Reviewers to instantly access the Customer, Vendor, and Admin apps without creating accounts.
