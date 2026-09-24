#  MediFinder — Medicine Availability Finder

> A web-based platform designed to help users quickly find medicines and locate nearby pharmacies where the required medicine is available.

##  Overview

**MediFinder** is a web-based Medicine Availability Finder developed to solve the common problem of locating medicines across different pharmacies.

Users can search for a required medicine and check its availability at registered pharmacies. The system provides relevant pharmacy information, making it easier for users to locate medicines without visiting or calling multiple pharmacies.

The project aims to make medicine searching **faster, easier, and more convenient** through a centralized digital platform.

## Problem Statement

Finding required medicines in nearby pharmacies can be time-consuming and inconvenient, especially when the medicine is urgently needed.

MediFinder provides a centralized platform that helps users search for medicines and identify pharmacies where the required medicine is available.

##  Objectives

* To provide a simple platform for searching medicines.
* To help users find pharmacies with available medicines.
* To reduce the time spent visiting multiple pharmacies.
* To provide important pharmacy and medicine information.
* To maintain medicine availability records efficiently.
* To provide an easy-to-use and user-friendly interface.

---

## Key Features

###  User Features

*  Search medicines by name.
*  View medicine availability.
*  Find pharmacies where the medicine is available.
*  View pharmacy location/details.
*  Access pharmacy contact information.
*  View relevant medicine information.
*  Simple and responsive user interface.

###  Admin Features

* Add new medicines.
* Update medicine information.
* Manage pharmacy records.
* Update medicine availability.
* Remove outdated records.
* Manage the overall system data.

---

##  How It Works


User
  ↓
Search for Medicine
  ↓
System checks Medicine Records
  ↓
Find Available Pharmacies
  ↓
Display Pharmacy Details
  ↓
User contacts/visits the selected Pharmacy

---

##  Technology Stack

### Frontend

* HTML5
* CSS3
* JavaScript

### Backend

* Node.js
* Express.js

### Database

* MySQL

### Tools & Technologies

* Git
* GitHub
* VS Code
* Postman
* Figma
---

## System Architecture

             ┌─────────────────┐
             │      User       │
             └────────┬────────┘
                      │
                      ▼
             ┌─────────────────┐
             │    Frontend     │
             │ HTML/CSS/JS     │
             └────────┬────────┘
                      │
                      ▼
             ┌─────────────────┐
             │     Backend     │
             │ Node.js/Express │
             └────────┬────────┘
                      │
                      ▼
             ┌─────────────────┐
             │     MySQL       │
             │    Database     │
             └─────────────────┘



##  Project Structure


Medicine-Availability-Finder/
│
├── frontend/
│   ├── index.html
│   ├── login.html
│   ├── register.html
│   ├── search.html
│   ├── pharmacy.html
│   ├── css/
│   │   └── style.css
│   └── js/
│       └── script.js
│
├── backend/
│   ├── server.js
│   ├── routes/
│   ├── controllers/
│   └── models/
│
├── database/
│   └── database.sql
│
├── README.md
└── package.json

---

##  Database

The system uses **MySQL** to store and manage application data.

Possible database entities include:

### Medicine

| Field         | Description                |
| ------------- | -------------------------- |
| Medicine ID   | Unique medicine identifier |
| Medicine Name | Name of the medicine       |
| Category      | Medicine category          |
| Price         | Medicine price             |
| Description   | Basic medicine information |

### Pharmacy

| Field         | Description                |
| ------------- | -------------------------- |
| Pharmacy ID   | Unique pharmacy identifier |
| Pharmacy Name | Name of pharmacy           |
| Address       | Pharmacy address           |
| Contact       | Contact number             |
| Location      | Pharmacy location          |

### Availability

| Field           | Description              |
| --------------- | ------------------------ |
| Availability ID | Unique record identifier |
| Medicine ID     | Associated medicine      |
| Pharmacy ID     | Associated pharmacy      |
| Quantity        | Available stock          |
| Status          | Available/Unavailable    |

---

##  Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/medicine-availability-finder.git
```

### 2. Navigate to the Project Directory

```bash
cd medicine-availability-finder
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Configure MySQL

Create a MySQL database and import the provided SQL file:

```text
database/database.sql
```

Update the database credentials in the backend configuration according to your local MySQL setup.

### 5. Start the Server

```bash
node server.js
```

or, if a start script is configured:

```bash
npm start
```

### 6. Open the Application

Open the frontend in your browser or access the backend server through the configured local URL.

---

##  Example Use Case

**Scenario:**
A user needs a particular medicine but does not know which nearby pharmacy has it.

**Using MediFinder:**

1. User opens MediFinder.
2. Searches for the required medicine.
3. The system checks available medicine records.
4. Matching pharmacies are displayed.
5. User views pharmacy details.
6. User contacts or visits the selected pharmacy.

---

##  Security Considerations

The system can implement basic security measures such as:

* User authentication.
* Admin authentication.
* Password protection.
* Input validation.
* Secure database queries.
* Role-based access control.
* Protection against unauthorized data modification.

---

##  Future Enhancements

The project can be further enhanced with:

*  GPS-based nearby pharmacy detection.
*  Google Maps/OpenStreetMap integration.
*  Medicine availability notifications.
*  Mobile application support.
*  AI-powered medicine search assistance.
*  Pharmacy inventory management.
*  Price comparison between pharmacies.
*  Real-time stock updates.
*  Pharmacy ratings and reviews.
*  Online medicine ordering integration.

---

## 🎓 Project Scope

MediFinder can be useful for:

* Patients and their family members.
* Local pharmacies.
* Healthcare-related organizations.
* Medical stores managing inventory.
* Users looking for medicines in unfamiliar locations.

The system focuses on **medicine availability and pharmacy information** and does not replace professional medical consultation or prescriptions.

**Project Name:** Medicine Availability Finder (MediFinder)

**Developed By:**

* Vaibhavi Bajpai

**Institute:**
KIET Deemed to be University

##  Project Status

 **Project Status:** In Development

The project is currently being developed and may receive additional features and improvements.

##  Contributing

Contributions are welcome.

To contribute:

1. Fork the repository.
2. Create a new branch.

```bash
git checkout -b feature-name
```

3. Make your changes.
4. Commit your changes.

```bash
git commit -m "Add new feature"
```

5. Push the branch.

```bash
git push origin feature-name
```

6. Create a Pull Request.

---

##  License

This project is developed for **educational and academic purposes**.

---

##  Support

If you find this project useful, consider giving the repository a ⭐ on GitHub.
