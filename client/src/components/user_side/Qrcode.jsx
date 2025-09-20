// import React, { useEffect, useRef, useState } from "react";
// import { Html5Qrcode } from "html5-qrcode";
// import { useNavigate } from "react-router-dom";
// import axios from "axios";
// import { useAuth } from "../../context/AuthContext";
// import "react-toastify/dist/ReactToastify.css";

// const Qrcode = () => {
//   const navigate = useNavigate();
//   const html5QrCodeRef = useRef(null);
//   const [isCheckedIn, setIsCheckedIn] = useState(() => {
//     const inT = localStorage.getItem("checkInTime");
//     const outT = localStorage.getItem("checkOutTime");
//     return !!inT && !outT;
//   });

//   const [data, setData] = useState("No result");
//   const [scannerRunning, setScannerRunning] = useState(false);
//   const token = localStorage.getItem("accessToken");
//   // console.log(token)

//   const cancel = () => navigate("/");

//   const isValidURL = (str) => {
//     try {
//       new URL(str);
//       return true;
//     } catch {
//       return false;
//     }
//   };
//   const handleScanning = async (decodedText) => {
//     const BASE_URL = "https://csi-attendance-web-s1yf.onrender.com"; // or your real backend URL

//     try {
//       const res = await axios.post(
//         `${BASE_URL}/attend/scan`,
//         { code: decodedText, qrType: isCheckedIn ? "check-Out" : "check-in" },
//         { headers: { Authorization: `Bearer ${token}` }, withCredentials: true }
//       );
//       const qrData = JSON.parse(decodedText);
//       // const res = await axios.post(
//       //   `${BASE_URL}/attend/scan`,
//       //   // { code : decodedText },
//       //   qrData,
//       //   {header:{Authorization : `Bearer ${token}`,},
//       //   withCredentials: true ,}
//       // );

//       if (res.data) {
//         console.log("Response:", res.data);
//         navigate("/Complete");
//       }
//     } catch (error) {
//       // console.error("Scan failed:", error.response?.data || error.message);
//     }
//   };

//   // ✅ Send scanned data to backend
//   // const handleScanning = async (e) => {
//   //   try {
//   //     const res = await axios.post(`${BASE_URL}/attend/scan`,
//   //     {data: decodedText}, // or str: decodedText if backend expects "str"
//   //     {withCredentials: true,}
//   //   );
//   //   if (res.data) {
//   //     // login(res.data.user, res.data.accessToken);
//   //     // toast.success("Login successful!");
//   //     navigate("/Complete");
//   //   }
//   // } catch (error) {
//   //   // toast.error(error.response?.data?.message || "Login error");
//   // }
//   //     e?.preventDefault();

//   // .then((res) => {
//   //   console.log("Data sent to backend:", res.data.code);
//   //   // Handle success, navigate or show message if needed
//   //   toast.success("QR processed!");
//   // })
//   // .catch((error) => {
//   //   console.error("Error sending to backend:", error.response?.data || error.message);
//   //   // Optional: show toast or alert
//   //   toast.error("Failed to process QR code");

//   // });
//   // }

//   const handleCheckIn = () => {
//     const now = new Date();
//     localStorage.setItem("checkInTime", now.toISOString());
//     localStorage.removeItem("checkOutTime");
//     setIsCheckedIn(true);
//     // localStorage.setItem("token", res.data.token);
//     navigate("/Complete");
//   };

//   const handleCheckOut = () => {
//     const now = new Date();
//     localStorage.setItem("checkOutTime", now.toISOString());
//     setIsCheckedIn(false);
//     navigate("/Dashboard");
//   };

//   const handleToggle = () => {
//     handleScanning();
//     if (isCheckedIn) handleCheckOut();
//     else handleCheckIn();
//     navigate("/complete");
//   };

//   useEffect(() => {
//     const saved = localStorage.getItem("scannedData");
//     if (saved) setData(saved);

//     const elementId = "qr-reader";
//     html5QrCodeRef.current = new Html5Qrcode(elementId);

//     Html5Qrcode.getCameras().then((devices) => {
//       if (!devices || devices.length === 0) {
//         alert("No camera found");
//         return;
//       }

//       const cameraId = devices[0].id;
//       html5QrCodeRef.current
//         .start(
//           cameraId,
//           {
//             fps: 10,
//             qrbox: { width: 300, height: 300 },
//             aspectRatio: 0.7,
//             disableFlip: true,
//           },
//           (decodedText) => {
//             console.log(decodedText);
//             setData(decodedText);
//             localStorage.setItem("scannedData", decodedText);
//             handleScanning(decodedText);

//             // Stop scanner safely
//             if (html5QrCodeRef.current && scannerRunning) {
//               html5QrCodeRef.current
//                 .stop()
//                 .then(() => {
//                   html5QrCodeRef.current.clear();
//                   setScannerRunning(false);

//                   // Open URL if scanned QR is a valid link
//                   if (isValidURL(decodedText)) {
//                     window.location.href = decodedText;
//                   }
//                 })
//                 .catch(() => console.warn("Scanner stop failed"));
//             }
//           }
//         )
//         .then(() => setScannerRunning(true))
//         .catch(() => alert("Failed to start scanner"));
//     });
//     // .catch(() => alert("Camera access denied"));

//     return () => {
//       if (html5QrCodeRef.current && scannerRunning) {
//         html5QrCodeRef.current
//           .stop()
//           .then(() => html5QrCodeRef.current.clear())
//           .catch(() => console.warn("Cleanup stop failed"));
//       }
//     };
//   }, []);

//   return (
//     <div className="flex flex-col items-center justify-center w-screen h-[100dvh] gap-4 pt-[70px] pb-[30px]">
//       {/* Close Button */}
//       <img
//         onClick={cancel}
//         src="/src/assets/cross.png"
//         className="h-[12px] absolute right-[15px] top-[25px] cursor-pointer"
//         alt="Cancel"
//       />

//       {/* Title */}
//       <div className="text flex flex-col items-center justify-center gap-0.5">
//         <span className="font-bold text-lg">Scan Code</span>
//         <span className="font-medium text-gray-400 text-xs">
//           Scan QR Code to check securely
//         </span>
//       </div>

//       {/* Scanner */}
//       <div
//         id="qr-reader"
//         className="w-[350px] rounded-[22px] m-auto flex overflow-hidden"
//       />

//       {/* Toggle Button */}
//       <button
//         onClick={handleToggle}
//         className={`flex justify-center items-center rounded-lg text-sm font-medium gap-3
//           ${isCheckedIn ? "bg-red-500" : "bg-[#1D61E7]"}
//           text-white w-[350px] h-[48px] shadow-[0px_4px_4px_0px_#00000040]
//           active:shadow-[0px_2px_1px_0px_#00000040] transition-all duration-100`}
//       >
//         {isCheckedIn ? "Check Out" : "Check In"}
//         <img
//           src="/src/assets/check.png"
//           className="h-[15px] invert-100"
//           alt="Check"
//         />
//       </button>
//     </div>
//   );
// };

// export default Qrcode;
// // import React, { useEffect, useRef, useState } from "react";
// // import { Html5Qrcode } from "html5-qrcode";
// // import { useNavigate } from "react-router-dom";
// // import { useAuth } from "../../context/AuthContext";

// // const Qrcode = () => {
// //   const navigate = useNavigate();
// //   const { BASE_URL } = useAuth();

// //   // DOM and scanner refs
// //   const readerRef = useRef(null);
// //   const html5QrCodeRef = useRef(null);
// //   const [isCheckedIn, setIsCheckedIn] = useState(() => {
// //     const inT = localStorage.getItem("checkInTime");
// //     const outT = localStorage.getItem("checkOutTime");
// //     return !!inT && !outT;
// //   });

// //   const [data, setData] = useState("No result");
// //   const [scannerRunning, setScannerRunning] = useState(false);

// //   const cancel = () => navigate("/");

// //   const isValidURL = (str) => {
// //     try {
// //       new URL(str);
// //       return true;
// //     } catch {
// //       return false;
// //     }
// //   };

// //   const handleCheckIn = () => {
// //     const now = new Date();
// //     localStorage.setItem("checkInTime", now.toISOString());
// //     localStorage.removeItem("checkOutTime");
// //     setIsCheckedIn(true);
// //     navigate("/Complete");
// //   };

// //   const handleCheckOut = () => {
// //     const now = new Date();
// //     localStorage.setItem("checkOutTime", now.toISOString());
// //     setIsCheckedIn(false);
// //     navigate("/Dashboard");
// //   };

// //   const handleToggle = () => {
// //     if (isCheckedIn) handleCheckOut();
// //     else handleCheckIn();
// //   };

// //   useEffect(() => {
// //     const saved = localStorage.getItem("scannedData");
// //     if (saved) setData(saved);

// //     const elementId = "qr-reader";
// //     html5QrCodeRef.current = new Html5Qrcode(elementId);

// //     Html5Qrcode.getCameras()
// //       .then((devices) => {
// //         if (!devices || devices.length === 0) {
// //           alert("No camera found");
// //           return;
// //         }

// //         const cameraId = devices[0].id;
// //         html5QrCodeRef.current
// //           .start(
// //             cameraId,
// //             { fps: 10, qrbox: { width: 300, height: 300 },aspectRatio: 0.7, disableFlip: true },
// //             (decodedText) => {
// //               setData(decodedText);
// //               localStorage.setItem("scannedData", decodedText);

// //               // Stop scanner safely
// //               if (html5QrCodeRef.current && scannerRunning) {
// //                 html5QrCodeRef.current
// //                   .stop()
// //                   .then(() => {
// //                     html5QrCodeRef.current.clear();
// //                     setScannerRunning(false);

// //                     // Open URL if scanned QR is a valid link
// //                     if (isValidURL(decodedText)) {
// //                       window.location.href = decodedText;
// //                     }
// //                   })
// //                   .catch(() => console.warn("Scanner stop failed"));
// //               }
// //             }
// //           )
// //           .then(() => setScannerRunning(true))
// //           .catch(() => alert("Failed to start scanner"));
// //       })
// //       // .catch(() => alert("Camera access denied"));

// //     return () => {
// //       mountedRef.current = false;
// //       stopScanner();
// //     };
// //   }, []);

// //   return (
// //     <div className="flex flex-col items-center justify-center w-screen h-[100dvh] gap-4 pt-[70px] pb-[30px] px-4">
// //       {/* Close/Back Button */}
// //       <img
// //         // onClick={goBack}
// //         src="/cross.png"
// //         className="h-[12px] absolute right-[15px] top-[25px] cursor-pointer"
// //         alt="Back"
// //       />

// //       {/* Title */}
// //       <div className="text flex flex-col items-center justify-center gap-0.5">
// //         <span className="font-bold text-lg">
// //           {showTypeSelector ? "Select Attendance Type" : "Scan QR Code"}
// //         </span>
// //         <span className="font-medium text-gray-400 text-xs">
// //           {showTypeSelector
// //             ? "Choose check-in or check-out"
// //             : `Scanning for ${selectedType}...`}
// //         </span>
// //       </div>

// //       {/* Main Content */}
// //       {showTypeSelector ? (
// //         /* Type Selection Buttons */
// //         <div className="flex flex-col gap-4 w-[350px] max-w-[90vw]">
// //           <button
// //             onClick={() => handleTypeSelection("check-in")}
// //             className="flex justify-center items-center rounded-lg text-sm font-medium gap-3
// //               bg-green-500 hover:bg-green-600 text-white w-full h-[48px] shadow-[0px_4px_4px_0px_#00000040]
// //               active:shadow-[0px_2px_1px_0px_#00000040] transition-all duration-200"
// //           >
// //             Check In
// //             <img src="/check.png" className="h-[15px] invert" alt="Check In" />
// //           </button>

// //           <button
// //             onClick={() => handleTypeSelection("check-out")}
// //             className="flex justify-center items-center rounded-lg text-sm font-medium gap-3
// //               bg-red-500 hover:bg-red-600 text-white w-full h-[48px] shadow-[0px_4px_4px_0px_#00000040]
// //               active:shadow-[0px_2px_1px_0px_#00000040] transition-all duration-200"
// //           >
// //             Check Out
// //             <img
// //               src="/check.png"
// //               className="h-[15px] invert"
// //               alt="Check Out"
// //             />
// //           </button>
// //         </div>
// //       ) : (
// //         /* QR Scanner Section */
// //         <div className="w-full max-w-md">
// //           <div
// //             ref={readerRef}
// //             id="qr-reader"
// //             className="mb-4 rounded-lg overflow-hidden border-2 border-gray-200"
// //             style={{ width: "100%" }}
// //           />

// //           {isLoading && (
// //             <div className="text-center mb-4">
// //               <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-2" />
// //               <p className="text-sm text-gray-600">Processing...</p>
// //             </div>
// //           )}

// //           {message && (
// //             <div
// //               className={`text-center mb-4 p-3 rounded-lg font-medium ${
// //                 message.includes("✅") || qrDetected
// //                   ? "bg-green-100 text-green-700 border border-green-200"
// //                   : message.includes("❌")
// //                   ? "bg-red-100 text-red-700 border border-red-200"
// //                   : message.includes("⚠️")
// //                   ? "bg-yellow-100 text-yellow-700 border border-yellow-200"
// //                   : "bg-blue-100 text-blue-700 border border-blue-200"
// //               }`}
// //             >
// //               {message}
// //               {qrDetected && detectedQrCode && (
// //                 <div className="mt-2 text-sm bg-gray-50 p-2 rounded border">
// //                   <strong>Detected Code:</strong> {detectedQrCode}
// //                 </div>
// //               )}
// //             </div>
// //           )}

// //           {!scannerInitialized && !isLoading && !message.includes("❌") && (
// //             <div className="text-center mb-4">
// //               <button
// //                 onClick={startScanner}
// //                 className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg mb-2 transition duration-200"
// //               >
// //                 📷 Start Camera
// //               </button>
// //               <p className="text-xs text-gray-500">
// //                 Make sure to allow camera permissions when prompted
// //               </p>
// //             </div>
// //           )}

// //           {message.includes("❌") && !isLoading && (
// //             <div className="text-center mb-4">
// //               <button
// //                 onClick={() => {
// //                   setScannerInitialized(false);
// //                   setMessage("");
// //                   setQrDetected(false);
// //                   setDetectedQrCode("");
// //                   // ADDED: reset processing guard on retry
// //                   processingRef.current = false;
// //                 }}
// //                 className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg transition duration-200"
// //               >
// //                 🔄 Try Again
// //               </button>
// //             </div>
// //           )}
// //         </div>
// //       )}

// //       {/* Back Button */}
// //       <button
// //         onClick={handleToggle}
// //         className={`flex justify-center items-center rounded-lg text-sm font-medium gap-3
// //           ${isCheckedIn ? "bg-red-500" : "bg-[#1D61E7]"}
// //           text-white w-[350px] h-[48px] shadow-[0px_4px_4px_0px_#00000040]
// //           active:shadow-[0px_2px_1px_0px_#00000040] transition-all duration-100`}
// //       >
// //         {showTypeSelector ? "🏠 Back to Dashboard" : "⬅️ Back"}
// //       </button>
// //     </div>
// //   );
// // };

// // export default Qrcode;
// // Qrcode.jsx

// // import React, { useEffect, useRef, useState } from "react";
// // import { Html5Qrcode } from "html5-qrcode";
// // import { useNavigate } from "react-router-dom";
// // import axios from "axios";

// // const Qrcode = () => {
// //   const navigate = useNavigate();
// //   const html5QrCodeRef = useRef(null);

// //   const [scannerRunning, setScannerRunning] = useState(false);
// //   const [errorMessage, setErrorMessage] = useState("");
// //   const [data, setData] = useState("No result");

// //   const BASE_URL = "https://csi-attendance-web-s1yf.onrender.com"; // your backend

// //   const cancel = () => {
// //     navigate("/");
// //   };

// //   const isValidURL = (str) => {
// //     try {
// //       new URL(str);
// //       return true;
// //     } catch {
// //       return false;
// //     }
// //   };

// //   const handleScanning = async (decodedText) => {
// //     // decodedText might be JSON string or plain string depending on QR
// //     let parsedData = null;
// //     try {
// //       parsedData = JSON.parse(decodedText);
// //     } catch(e) {
// //       // If it's not JSON, wrap it
// //       parsedData = { codeData: decodedText };
// //     }

// //     const token = localStorage.getItem("token");
// //     if (!token) {
// //       console.error("Scan failed: No token found in localStorage.");
// //       setErrorMessage("You must login first.");
// //       navigate("/login");  // redirect to login if needed
// //       return;
// //     }

// //     try {
// //       const res = await axios.post(
// //         `${BASE_URL}/attend/scan`,
// //         parsedData,
// //         {
// //           headers: {
// //             Authorization: `Bearer ${token}`,
// //             "Content-Type": "application/json"
// //           },
// //           withCredentials: true,
// //         }
// //       );
// //       console.log("Scan successful:", res.data);
// //       // navigate to success page
// //       navigate("/Complete");
// //     } catch (error) {
// //       console.error("Scan failed:", error.response?.data || error.message);
// //       setErrorMessage(
// //         error.response?.data?.message || "Scan request failed."
// //       );
// //     }
// //   };

// //   useEffect(() => {
// //     const elementId = "qr-reader";
// //     html5QrCodeRef.current = new Html5Qrcode(elementId);

// //     Html5Qrcode.getCameras()
// //       .then((devices) => {
// //         if (!devices || devices.length === 0) {
// //           setErrorMessage("No camera found");
// //           return;
// //         }
// //         const cameraId = devices[0].id;

// //         html5QrCodeRef.current
// //           .start(
// //             cameraId,
// //             { fps: 10, qrbox: { width: 300, height: 300 }, aspectRatio: 1.0, disableFlip: true },
// //             (decodedText) => {
// //               console.log("Decoded:", decodedText);
// //               setData(decodedText);
// //               localStorage.setItem("scannedData", decodedText);

// //               handleScanning(decodedText);

// //               // stop scanner
// //               if (html5QrCodeRef.current && scannerRunning) {
// //                 html5QrCodeRef.current
// //                   .stop()
// //                   .then(() => {
// //                     html5QrCodeRef.current.clear();
// //                     setScannerRunning(false);

// //                     if (isValidURL(decodedText)) {
// //                       window.location.href = decodedText;
// //                     }
// //                   })
// //                   .catch((err) => {
// //                     console.warn("Scanner stop failed", err);
// //                   });
// //               }
// //             }
// //           )
// //           .then(() => {
// //             setScannerRunning(true);
// //           })
// //           .catch((err) => {
// //             console.error("Failed to start scanner", err);
// //             setErrorMessage("Failed to start scanner");
// //           });
// //       })
// //       .catch((err) => {
// //         console.error("Error getting cameras", err);
// //         setErrorMessage("Error accessing camera");
// //       });

// //     return () => {
// //       if (html5QrCodeRef.current && scannerRunning) {
// //         html5QrCodeRef.current
// //           .stop()
// //           .then(() => {
// //             html5QrCodeRef.current.clear();
// //           })
// //           .catch((err) => console.warn("Cleanup stop failed", err));
// //       }
// //     };
// //   }, [scannerRunning]);

// //   return (
// //     <div style={{ padding: 20 }}>
// //       <h2>Scan QR Code</h2>
// //       {errorMessage && <div style={{ color: "red" }}>{errorMessage}</div>}
// //       <div id="qr-reader" style={{ width: 350, height: 350, border: "1px solid #ccc" }}></div>
// //       <div>Scanned data: {data}</div>
// //       <button onClick={cancel}>Cancel</button>
// //     </div>
// //   );
// // };

// // export default Qrcode;

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode, Html5QrcodeScanner } from "html5-qrcode";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const Qrcode = () => {
  const navigate = useNavigate();
  const { BASEURL, getAuthHeaders } = useAuth();
  const html5QrCodeRef = useRef(null);
  const scannerRef = useRef(null);
  const processingRef = useRef(false);

  const [scannerRunning, setScannerRunning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedType, setSelectedType] = useState("check-in");

  const handleScanSuccess = useCallback(
    async (decodedText) => {
      // Prevent multiple simultaneous scans
      if (processingRef.current) return;
      processingRef.current = true;

      setIsLoading(true);
      setMessage("Processing QR code...");

      try {
        const response = await fetch(`${BASEURL}/attend/scan`, {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            code: decodedText,
            type: selectedType,
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const result = await response.json();
        console.log("Scan successful:", result);

        // Stop scanner before navigation
        if (scannerRef.current) {
          await scannerRef.current.clear();
        }

        navigate("/animation");
      } catch (error) {
        console.error("Scan failed:", error);
        setMessage(`❌ ${error.message || "Scan failed. Please try again."}`);
        processingRef.current = false;
      } finally {
        setIsLoading(false);
      }
    },
    [BASEURL, getAuthHeaders, selectedType, navigate]
  );

  const initializeScanner = useCallback(() => {
    if (scannerRef.current) {
      scannerRef.current.clear();
    }

    const config = {
      fps: 30, // Higher FPS for faster detection
      qrbox: { width: 280, height: 280 },
      aspectRatio: 1.0,
      disableFlip: false,
      videoConstraints: {
        facingMode: "environment", // Use back camera on mobile
        width: { min: 640, ideal: 1280, max: 1920 },
        height: { min: 480, ideal: 720, max: 1080 },
      },
    };

    scannerRef.current = new Html5QrcodeScanner("qr-reader", config, false);

    scannerRef.current.render(handleScanSuccess, (error) => {
      // Only log actual errors, not "No QR code found" messages
      if (!error.includes("No QR code found")) {
        console.warn("QR scan error:", error);
      }
    });

    setScannerRunning(true);
  }, [handleScanSuccess]);

  const stopScanner = useCallback(() => {
    if (scannerRef.current && scannerRunning) {
      scannerRef.current.clear();
      setScannerRunning(false);
    }
  }, [scannerRunning]);

  const handleTypeChange = (type) => {
    setSelectedType(type);
    setMessage("");
    processingRef.current = false;
  };

  useEffect(() => {
    initializeScanner();

    return () => {
      stopScanner();
      processingRef.current = false;
    };
  }, [selectedType]); // Reinitialize when type changes

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      {/* Close Button */}
      <button
        onClick={() => navigate("/")}
        className="absolute top-6 right-6 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-100 transition-colors z-10"
        aria-label="Close"
      >
        <svg
          className="w-6 h-6 text-gray-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>

      <div className="w-full max-w-md mx-auto bg-white rounded-2xl shadow-xl p-6 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-gray-800">Scan QR Code</h1>
          <p className="text-gray-600 text-sm">
            Select attendance type and scan the QR code
          </p>
        </div>

        {/* Type Selection */}
        <div className="flex space-x-2 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => handleTypeChange("check-in")}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
              selectedType === "check-in"
                ? "bg-green-500 text-white shadow-sm"
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            Check In
          </button>
          <button
            onClick={() => handleTypeChange("check-out")}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
              selectedType === "check-out"
                ? "bg-red-500 text-white shadow-sm"
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            Check Out
          </button>
        </div>

        {/* Scanner Container */}
        <div className="relative">
          <div
            id="qr-reader"
            className="w-full rounded-lg overflow-hidden"
            style={{ minHeight: "300px" }}
          />

          {/* Overlay for loading */}
          {isLoading && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
              <div className="bg-white rounded-lg p-4 flex items-center space-x-3">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500" />
                <span className="text-sm font-medium">Processing...</span>
              </div>
            </div>
          )}
        </div>

        {/* Status Message */}
        {message && (
          <div
            className={`text-center p-3 rounded-lg text-sm font-medium ${
              message.includes("✅")
                ? "bg-green-100 text-green-700"
                : message.includes("❌")
                ? "bg-red-100 text-red-700"
                : "bg-blue-100 text-blue-700"
            }`}
          >
            {message}
          </div>
        )}

        {/* Instructions */}
        <div className="text-center space-y-2 text-xs text-gray-500">
          <p>• Position the QR code within the scanning area</p>
          <p>• Make sure there's adequate lighting</p>
          <p>• Hold your device steady for best results</p>
        </div>
      </div>
    </div>
  );
};

export default Qrcode;
