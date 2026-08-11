# BIDECEL — Decentralized Death Certificate Ledger

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.0+-61DAFB.svg)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4+-38B2AC.svg)](https://tailwindcss.com/)
[![HL7 FHIR R4](https://img.shields.io/badge/Interoperability-HL7_FHIR_R4-orange.svg)](https://hl7.org/fhir/)
[![Security: ZKP & AES-256](https://img.shields.io/badge/Security-ZKP_%26_AES--256-emerald.svg)](#)

> **BIDECEL** (Decentralized Death Certificate Ledger) is a production-grade, multi-stakeholder vital statistics registry built on immutable blockchain smart contract architecture, Zero-Knowledge Proof (ZKP) privacy controls, and HL7 FHIR R4 healthcare interoperability.

---

## 🏛️ Executive Summary & Problem Statement

Civil vital registration systems worldwide suffer from critical vulnerabilities:
* **Identity Theft & Pension Fraud**: Deceased identities remain unrevoked for months, enabling fraudulent pension payouts and illicit loan applications.
* **Probate Court Delays**: Families wait months for physical paper death certificates, stalling estate settlement and insurance claims.
* **Forged Medical Reports**: Unaccredited individuals issue fake death reports without verifiable physician credentials.
* **Rural Connectivity Gaps**: Health facilities in low-resource environments lack continuous connectivity to central databases.

**BIDECEL** solves these challenges by deploying an immutable ledger anchored by Secp256k1 ECDSA physician signatures, state-level civil registrar seals, and real-time verification APIs for banks, insurers, and government agencies.

---

## 🔬 Core Architecture & Technical Highlights

```
+-----------------------------------------------------------------------------------+
|                                  BIDECEL SYSTEM ARCHITECTURE                      |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|  [ Public Homepage & Verification Engine ]                                        |
|         │                                                                         |
|         ├──> [ Medical Officer Workstation ] ──> Secp256k1 ECDSA Physician Sign     |
|         │                                          │                              |
|         ├──> [ Civil Registrar Portal ] ────> On-Chain State Seal Authorization   |
|         │                                          │                              |
|         ├──> [ Family Beneficiary Portal ] ─> ZK Access Keys & Shamir Key Escrow   |
|         │                                          │                              |
|         ├──> [ Verifying Agency Hub ] ──────> QR Code & Zero-Trust Hash Audits   |
|         │                                          │                              |
|         └──> [ System Auditor Workstation ] ─> Merkle Root Hash & Tamper Shield   |
|                                                    │                              |
|  ===============================================================================  |
|                        CRYPTOGRAPHIC & INTEROPERABILITY LAYER                      |
|  ===============================================================================  |
|   • SHA-256 Merkle Tree Blockchain Engine   • AES-256 Field-Level PII Encryption     |
|   • HL7 FHIR R4 Bundling & ICD-10 Engine    • Offline 2G/3G IndexedDB Queueing     |
|   • Multi-Jurisdiction Regulatory Matrix    • Shamir's 3-of-5 Secret Sharing Shards |
+-----------------------------------------------------------------------------------+
```

### 1. Cryptographic Ledger & Merkle Tree Consensus
* **Block Integrity**: Transactions are stored in a deterministic block topology where every block contains the SHA-256 hash of the previous block, timestamp, validator signatures, and a calculated Merkle tree root hash.
* **Tamper Resistance**: Modifying any historical block payload immediately breaks the Merkle tree hash chain, triggering instant alerts across validator nodes and highlighting corrupted blocks in red during audit checks.

### 2. Zero-Knowledge Proofs (ZKP) & Field-Level AES-256 Encryption
* **Privacy Preservation**: Personally Identifiable Information (PII) is encrypted client-side using AES-256. 
* **Selective Disclosure**: Beneficiaries can generate **Temporal ZK Access Keys** for third parties (e.g., insurance companies or probate attorneys). Verifiers confirm certificate validity without exposing sensitive clinical cause-of-death details.

### 3. Key Recovery Escrow (Shamir's Secret Sharing)
* **3-of-5 Threshold Security**: Master decryption keys for estate records are split into 5 cryptographic shards distributed across trusted entities (Civil Registrar, Family Representative, Legal Counsel, Health Ministry, Judiciary). Any 3 shards can re-synthesize the master key if lost.

### 4. HL7 FHIR R4 & ICD-10 Interoperability
* **Standardized Data Interchange**: Ingests and exports official `Composition` and `DiagnosticReport` FHIR bundles (`.fhir.json`).
* **AI Clinical Logic Checks**: Verifies underlying cause-of-death against WHO ICD-10 medical coding standards, flagging biological impossibilities (e.g., age at death younger than onset date).

### 5. Offline-First PWA Engine
* **Low-Bandwidth Resiliency**: Medical officers in remote 2G/3G health posts issue reports offline. Records are queued in local IndexedDB storage and auto-synced to the ledger as soon as connectivity resumes.

---

## 👥 Stakeholder Role Portals

| Role Portal | Key Capabilities |
| :--- | :--- |
| **🌐 Public Homepage** | Instant record verification by Ref ID, ledger height stats, FAQ protocol specs, and role switcher. |
| **🩺 Medical Officer Workstation** | Issue certificates, AI ICD-10 clinical sanity checks, FHIR bundle upload, ECDSA digital signing, offline queue. |
| **🏛️ Civil Registrar Portal** | Review physician reports, audit doctor council credentials, apply State-Level On-Chain Seals, revoke certificates. |
| **👨‍👩‍👧 Family & Beneficiary Portal** | Search records, download watermarked official PDF certificates with embedded QR codes, issue ZK access keys, manage Shamir key shards. |
| **🔍 Verifying Agency Hub** | Real-time QR code camera scanner simulator, zero-trust cryptographic verification, anti-pension fraud alerts. |
| **🛡️ System Auditor Workstation** | Merkle root hash diagnostics, live block tamper attack simulator, regulatory sovereignty matrix, genesis reset. |

---

## 🛠️ Technology Stack

* **Frontend**: React 18, Vite, TypeScript
* **Styling**: Tailwind CSS (Sophisticated High-Contrast Dark Canvas with Crisp Accent Colors)
* **Icons**: Lucide React
* **PDF & QR Generation**: `jspdf`, `qrcode`
* **Cryptography**: SHA-256 Web Crypto API, Secp256k1 ECDSA abstractions, AES-256-GCM, Shamir's Secret Sharing
* **Standards**: HL7 FHIR R4, WHO ICD-10 Coding

---

## 🚀 Quickstart & Development Setup

### Prerequisites
* Node.js 18.x or higher
* npm 9.x or higher

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/bidecel.git
cd bidecel

# Install dependencies
npm install

# Start the local development server (Port 3000)
npm run dev
```

### Build & Production Verification

```bash
# Validate TypeScript and linting rules
npm run lint

# Build the production distribution
npm run build

# Start the compiled production server
npm start
```

---

## ⚖️ Multi-Jurisdictional Regulatory Compliance

BIDECEL supports configurable regulatory sovereignty modes:
* **KE PDPA (Kenya Data Protection Act 2019)**: Primary jurisdiction compliance with KMPDC physician credential validation.
* **EU GDPR (General Data Protection Regulation)**: Right-to-be-forgotten handled via cryptographic erasure of off-chain key shards while preserving on-chain state hashes.
* **US HIPAA (Health Insurance Portability and Accountability Act)**: Protected Health Information (PHI) encrypted with zero-trust access controls.
* **SG PDPA (Singapore Personal Data Protection Act)**: Strict cross-border data transfer rules.

---

## 📄 License

This project is open-source software licensed under the [MIT License](LICENSE).
