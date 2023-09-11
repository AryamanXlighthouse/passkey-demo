import React, { useState } from "react";
import axios from "axios";
import "./App.css";
const getAuthMessage = async (address) => {
  try {
    const data = await axios
      .get(`https://encryption.lighthouse.storage/api/message/${address}`, {
        headers: {
          "Content-Type": "application/json",
        },
      })
      .then((res) => {
        return res.data[0].message;
      });

    return { message: data, error: null };
  } catch (err) {
    return { message: null, error: err?.response?.data || err.message };
  }
};

function bufferToBase64url(buffer) {
  const byteView = new Uint8Array(buffer);
  let str = "";
  for (const charCode of byteView) {
    str += String.fromCharCode(charCode);
  }

  // Binary string to base64
  const base64String = btoa(str);

  // Base64 to base64url
  // We assume that the base64url string is well-formed.
  const base64urlString = base64String
    ?.replace(/\+/g, "-")
    ?.replace(/\//g, "_")
    ?.replace(/=/g, "");
  return base64urlString;
}

function base64urlToBuffer(base64url) {
  let binary = atob(base64url?.replace(/_/g, "/")?.replace(/-/g, "+"));
  let length = binary.length;
  let buffer = new Uint8Array(length);

  for (let i = 0; i < length; i++) {
    buffer[i] = binary.charCodeAt(i);
  }

  return buffer;
}

function transformPublicKey(publicKey) {
  const selected_key_index = 0;
  let transformedPublicKey = {
    ...publicKey,
    challenge: new Uint8Array([...publicKey.challenge.data]),
    allowCredentials: [
      {
        type: "public-key",
        id: base64urlToBuffer(
          publicKey.allowCredentials[selected_key_index]?.credentialID
        ),
      },
    ],
  };

  return [
    transformedPublicKey,
    publicKey.allowCredentials[selected_key_index]?.credentialID,
  ];
}

function App() {
  const [account, setAccount] = useState("");
  const [error, setError] = useState("");
  const [chainId, setChainId] = useState("");
  const [keys, setKeys] = useState({});
  const [token, setToken] = useState("");

  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        // Request account access
        const accounts = await window.ethereum.request({
          method: "eth_requestAccounts",
        });
        setAccount(accounts[0]);
        const chainId = await window.ethereum.request({
          method: "eth_chainId",
        });
        setChainId(chainId);
      } catch (error) {
        console.error("User denied account access");
      }
    } else {
      console.error("Ethereum provider not detected");
    }
  };

  const disconnect = () => {
    setAccount("");
    setChainId("");
  };

  const signMessage = async (message) => {
    try {
      // Request signature from user's wallet
      const signature = await window.ethereum.request({
        method: "personal_sign",
        params: [account, message],
      });
      return signature;
    } catch (error) {
      console.error("Error signing the message:", error);
      setError(error.toString());
    }
  };

  const username = account.toLowerCase();
  const login = async () => {
    try {
      const startResponse = await axios.post(
        "https://encryption.lighthouse.storage/passkey/login/start",
        {
          address: username,
        }
      );
      const publicKey = startResponse.data;
      const [transformedPublicKey, credentialID] =
        transformPublicKey(publicKey);
      const credential = await navigator.credentials
        .get({
          publicKey: transformedPublicKey,
        })
        .then((credential) => {
          // credential created
          console.log(credential); // <-- check what is output to see what you need to call bufferToBase64url(credential.<...>) on down below

          // convert credential to json serializeable
          const serializeable = {
            authenticatorAttachment: credential.authenticatorAttachment,
            id: credential.id,
            rawId: bufferToBase64url(credential.rawId),
            response: {
              attestationObject: bufferToBase64url(
                credential.response.attestationObject
              ),
              clientDataJSON: bufferToBase64url(
                credential.response.clientDataJSON
              ),
              signature: bufferToBase64url(credential.response.signature),
              authenticatorData: bufferToBase64url(
                credential.response.authenticatorData
              ),
            },
            type: credential.type,
          };
          return serializeable;
        })
        .catch((err) => {
          console.error(err);
        });

      const finishResponse = await axios.post(
        "https://encryption.lighthouse.storage/passkey/login/finish",
        {
          credentialID,
          data: credential,
        }
      );
      const token = finishResponse.data.token;

      setToken(token);
      if (token) {
        alert("Successfully authenticated using webAuthn");
      }
    } catch (error) {
      console.error("Error during login:", error);
    }
  };

  const register = async () => {
    try {
      const { message, error } = await getAuthMessage(account.toLowerCase());
      // const data = await generate();
      const signedMessage = await signMessage(message);
      const response = await axios.post(
        "https://encryption.lighthouse.storage/passkey/register/start",
        {
          address: account.toLowerCase(),
        }
      );
      console.log(response.data?.challenge?.data);
      const publicKey = {
        ...response.data,
        challenge: new Uint8Array([...response.data?.challenge?.data]),
        user: {
          ...response.data?.user,
          id: new Uint8Array([...response.data?.user?.id]),
        },
      };
      const data = await navigator.credentials
        .create({ publicKey })
        .then((credential) => {
          // credential created
          // console.log(credential); <-- check what is output to see what you need to call bufferToBase64url(credential.<...>) on down below

          // convert credential to json serializeable
          const serializeable = {
            authenticatorAttachment: credential.authenticatorAttachment,
            id: credential.id,
            rawId: bufferToBase64url(credential.rawId),
            response: {
              attestationObject: bufferToBase64url(
                credential.response.attestationObject
              ),
              clientDataJSON: bufferToBase64url(
                credential.response.clientDataJSON
              ),
            },
            type: credential.type,
          };

          // const serialized = JSON.stringify(serializeable);

          return serializeable;
        })
        .catch((err) => {
          // an error occurred
          console.error(err);
        });

      // // pk is a PublicKeyCredential that is the result of a create() or get() Promise
      // const clientDataStr = arrayBufferToStr(data.clientDataJSON);
      // const clientDataObj = JSON.parse(clientDataStr);
      const finishResponse = await axios.post(
        "https://encryption.lighthouse.storage/passkey/register/finish",
        {
          data,
          address: username,
          signature: signedMessage,
          name: "MY Phone",
        }
      );

      // if (!finishResponse.ok) {
      //   throw new Error("Failed to finish registration");
      // }

      const finishData = await finishResponse.data;

      if (finishData) {
        alert("Successfully registered with WebAuthn");
      } else {
        throw new Error("Registration was not successful");
      }
    } catch (error) {
      alert(error.message);
    }
  };

  const deleteCredentials = async () => {
    try {
      const startResponse = await axios.post(
        "https://encryption.lighthouse.storage/passkey/login/start",
        {
          address: username,
        }
      );
      const publicKey = startResponse.data;
      const { message } = await getAuthMessage(account.toLowerCase());
      // const data = await generate();
      const signedMessage = await signMessage(message);
      const response = await axios.delete(
        "https://encryption.lighthouse.storage/passkey/delete",
        {
          data: {
            address: account.toLowerCase(),
            credentialID: publicKey.allowCredentials[0]?.credentialID,
          },
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${signedMessage}`,
          },
        }
      );
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        {!account ? (
          <button className="App-link" onClick={connectWallet}>
            Connect Wallet
          </button>
        ) : (
          <button className="App-link" onClick={disconnect}>
            Disconnect
          </button>
        )}
        <p>{`Account: ${account}`}</p>
        <p>{`Network ID: ${chainId ? Number(chainId) : "No Network"}`}</p>
        {account && (
          <>
            <button className="App-link" onClick={register}>
              Register
            </button>
            <button className="App-link" onClick={login}>
              Login
            </button>
            <button className="App-link" onClick={deleteCredentials}>
              Delete
            </button>
            <textarea
              style={{ fontWeight: "0.9rem", maxWidth: "80vw" }}
              value={`Bearer ${token}`}
            ></textarea>
          </>
        )}
      </header>
    </div>
  );
}

export default App;
