🚀 Blitzit Clone

A productivity-focused web application built with React + Vite, featuring task management, habit tracking, website blocking, analytics, and third-party integrations.

🛠 Tech Stack

Frontend: React, Vite, Tailwind CSS

Backend: Node.js, Express

Database: MongoDB

Integrations: Firebase, Notion

Tooling: ESLint, PostCSS

✨ Features

🔐 Authentication

✅ Task & habit tracking

📊 Analytics & data export (multiple formats)

🚫 Website blocking extension

🔗 Notion integration

🔥 Firebase integration

⚡ Fast development with Vite + HMR

📂 Project Structure
blitzit_clone/
├── public/
├── server/
├── src/
├── web-block-extension/
├── .env.example
├── .gitignore
├── package.json
└── README.md

🔑 Environment Variables Setup

This project uses environment variables for secure configuration.

1️⃣ Create your .env file
cp .env.example .env

2️⃣ Fill in your own values

Edit .env and add your own API keys:

PORT=5001
MONGODB_URI=

VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=

NOTION_API_KEY=
NOTION_API_VERSION=2022-06-28


⚠️ Important

Never commit .env to GitHub

.env is ignored via .gitignore

.env.example is safe and tracked

📦 Installation & Setup
Clone the repository
git clone https://github.com/devangpanchal23/blitzit_clone.git
cd blitzit_clone

Install dependencies
npm install

Start development server
npm run dev

Start backend (if applicable)
npm run server

📤 Data Export

Blitzit supports exporting analytics and task data in multiple formats for easy tracking and reporting.

🔒 Security Best Practices

Secrets are stored in .env (never committed)

GitHub Push Protection enabled

API keys must be rotated if exposed

Environment validation recommended for production

🧪 Linting
npm run lint

🚀 Build for Production
npm run build

🤝 Contributing

Create a feature branch

git checkout -b feature/your-feature


Commit changes

git commit -m "feat: add new feature"


Push and open a Pull Request

📄 License

This project is licensed for learning and personal use.

👨‍💻 Author

Devang Panchal
GitHub: @devangpanchal23

⭐ Final Notes

If you clone this repository:

Configure your .env

Add your own API keys

Run locally without exposing secrets