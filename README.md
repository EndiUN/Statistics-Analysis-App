# Statistics Analysis App

## 🚀 Live Demo

**Try the app now:** [https://devinmprz.github.io/Statistics-Analysis-App](https://devinmprz.github.io/Statistics-Analysis-App)

No installation required! Access the app directly in your browser to explore all features.

---

## Contents

- [Live Demo](#-live-demo)
- [Features](#features)
- [Requirements](#requirements)
- [Build & Run](#build--run)
- [Usage](#usage)
- [Data Format](#data-format)
  - [Minitool 1: Life Span of Batteries](#minitool-1-life-span-of-batteries)
  - [Minitool 2: Speed trap scenario, Cholesterol Level](#minitool-2-speed-trap-scenario-cholesterol-level)
  - [Minitool 3: Bivariate Scatter & Partitioning](#minitool-3-bivariate-scatter--partitioning)
- [Sample Data](#sample-data)

## Features

- **Life Span of Batteries**: This minitool allows students to explore and compare the life span of two different battery brands—Always Ready and Tough Cell.
- **Speed trap scenario**: Analyse changes in behaviour of traffic after the police implemented a speed trap on that section of the highway.
- **Cholesterol Level**: Analyse the changes of cholesterol level of the pacients of medical experiment, that came through certain diet.
- **Bivariate Scatter & Partitioning**: Dynamic scatter plot with draggable quadrants, customizable grids, and equal-group slicing for two-variable relationships.

## Requirements

> **Note:** If you just want to use the app, visit the [live demo](https://devinmprz.github.io/Statistics-Analysis-App) instead of setting up a development environment.

For local development:
- **Node.js** v14 or higher
- **npm** v6 or higher

## Build & Run

Clone the repository and install dependencies:

```bash
# Clone repository
git clone https://github.com/DevinMprz/Statistics-Analysis-App.git
cd Statistics-Analysis-App

# Install dependencies
npm install

#Buld the project
npm run start
```

## Usage

1. Open your browser to `http://localhost:8081`. (if 8081 is busy, expo will suggest you to use another port (usually 8082))
2. Select a Minitool from the navigation menu.
3. Use the on-screen controls or your input devices to interact with charts.

---

## Data Format

Scenarios can be uploaded as `.csv` or `.xlsx` files via the **Upload from File** button in each minitool. The required columns differ per tool.

### Minitool 1: Life Span of Batteries

Two required columns: `brand` and `lifespan`.

- `brand` — must be exactly `Tough Cell` or `Always Ready` (case-sensitive)
- `lifespan` — numeric value between 1 and 130

```csv
brand,lifespan
Tough Cell,85
Always Ready,90
Tough Cell,72
Always Ready,68
```

### Minitool 2: Speed trap scenario, Cholesterol Level

Two required columns: `before` and `after`. Both must contain numeric values. A row may leave one column empty as long as the other has a value.

```csv
before,after
200,180
210,190
195,172
```

### Minitool 3: Bivariate Scatter & Partitioning

Two required columns: `x` and `y`. Both must contain numeric values.

```csv
x,y
1.4,3.7
2.1,5.0
3.8,7.2
```

## Sample Data

The `data/` directory includes example files
