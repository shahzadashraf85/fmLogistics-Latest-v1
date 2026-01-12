# FM Logistics Portal

## 🚀 Overview
A clean, professional portal for managing logistics operations.

## 📋 Features

### **Navigation**
- **Active Jobs**: View current active jobs status (Access: All)
- **Import Jobs**: Import new jobs via CSV (Access: All)
- **User**: Manage users (Access: Admin only)

### **Roles & Permissions**
- **Admin**: Full access to User Management
- **Employee**: Access to Jobs and Profile settings

## 🛠️ Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Run Development Server**
   ```bash
   npm run dev
   ```

3. **Configure Environment Variables**
   Create a `.env` file with:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_GEMINI_API_KEY=your_gemini_api_key
   ```
   
   **Get your Gemini API key (FREE):**
   1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
   2. Click "Create API Key"
   3. Copy and paste into `.env` file

4. **Database Setup**
   Run the `fix_database.sql` script in Supabase SQL Editor.

## 👤 User Guide

### **Admins**
- Can view and manage all users via the "User" tab.
- Can access all job features.

### **Employees**
- Can view Active Jobs and Import Jobs.
- Access profile via the user section at the bottom of the sidebar.

### **Job Management Setup**

To enable the Job Management features (Import, Active Jobs, Assignments), you must set up the database:

1.  **Open Supabase SQL Editor**: Go to your Supabase project dashboard.
2.  **Run `jobs_database.sql`**: Copy the content of `/jobs_database.sql` and execute it.
    *   This creates the `jobs`, `job_import_batches`, `job_import_rows`, and `job_assignments` tables.
    *   It also sets up the necessary **Row Level Security (RLS)** policies.
3.  **Run Trigger Setup**: Ensure the user trigger is also set up (from `fix_database.sql`) so new users get profiles.

### **Features**

*   **Import Jobs**: Located at `/import-jobs`.
    *   Paste messy text or Excel rows.
    *   AI extracts: `Date`, `Lot Number`, `Company`, `Assets`, `Comments`, `Contact Info`.
    *   Review and approve jobs before they enter the system.
*   **Active Jobs**: View the list of currently active jobs.
*   **Assign Jobs**: (Coming Soon) Assign approved jobs to employees.

