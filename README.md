# Lighthouse Storage Passkey Demo Application

This React application demonstrates how to integrate WebAuthn authentication with an Ethereum wallet. Users can connect their Ethereum wallet, register, login, and delete their credentials using WebAuthn.

## Features

- Connect to Ethereum wallet
- Register using WebAuthn
- Login using WebAuthn
- Delete WebAuthn credentials
- Display connected Ethereum account and network ID

## Installation

1. Clone the repository:

```bash
git clone https://github.com/AryamanXlighthouse/passkey-demo.git
```

2. Navigate to the project directory:

```bash
cd passkey-demo
```

3. Install the required dependencies:

```bash
npm install
```

4. Start the development server:

```bash
npm start
```

## Usage

1. **Connect with Wallet and Sign Message**
   - Click on the "Connect Wallet" button to connect your Ethereum wallet.
   - Once connected, a message will be prompted for you to sign using your MetaMask wallet.

2. **Register and Verify with Passkey**
   - After signing the message, click on the "Register" button.
   - Follow the on-screen instructions to verify using the passkey.

3. **Login using Passkey**
   - Click on the "Login" button.
   - Provide the passkey to authenticate and access the application.


## Dependencies

- `react`: For building the user interface.
- `axios`: For making HTTP requests to the backend API.

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License

[MIT](https://choosealicense.com/licenses/mit/)
