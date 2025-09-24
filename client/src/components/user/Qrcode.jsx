import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeScanner } from 'html5-qrcode';
import { useNavigate } from 'react-router-dom';
// import { motion } from "framer-motion";

const Qrcode = () => {
    const navigate = useNavigate();
    const hidden1 = () => {
        navigate('/Complete')
    }
    const cancel = () => {
            navigate('/')
    }
    const [data, setData] = useState('No result')
    const scannerRef = useRef(null);
    const qrCodeRegionId = 'qr-reader';
    const html5QrCodeRef = useRef(null);
    const isValidURL = (str) => {
        try {
            new URL(str);
            return true;
        } catch (_) {
            return false;
        }
    };
    useEffect(() => {
        const saved = localStorage.getItem('scannedData');
        if (saved) setData(saved);
        html5QrCodeRef.current = new Html5Qrcode(qrCodeRegionId);
        Html5Qrcode.getCameras()
        .then((devices) => {
            if (devices.length === 0) {
                alert("No camera found");
                return;
            }
        const cameraId = devices[0].id;
        html5QrCodeRef.current.start(
            cameraId,
            {
                fps: 10,
                qrbox: { width: 240 , height: 340},
                aspectRatio: 0.7,
                disableFlip : true,
            },
            (decodedText, decodedResult) => {
                setData(decodedText);
                localStorage.setItem('scannedData', decodedText);
                html5QrCodeRef.current.stop().then(() => {
                    console.log('QR scanner stopped');
                    if (isValidURL(decodedText)) {
                    window.location.href = decodedText;
                }
                });
                },
                (errorMessage) => {
                }
                );
            })
            .catch((err) => {
                console.error("Camera error:", err);
                alert("Failed to access camera");
            });
    return () => {
        if (html5QrCodeRef.current) {
            html5QrCodeRef.current.stop().catch(() => {});
        }
    };
    }, []);
    
    return (
        // <motion.div
        //         initial = {{ opacity:1 ,x:100}}
        //         animate = {{ opacity:1 ,x:0}}
        //         exit={{opacity:0 , x:-100}}
        //         transition = {{duration:0.5}}
        //     >
        <div className="flex flex-col items-center justify-center w-screen h-screen gap-15 pt-[70px] pb-[30px]">
            <img onClick={cancel} src="/src/assets/cross.png" className='h-[12px] absolute right-[15px] top-[25px]' alt="" />
            <div className="text flex flex-col items-center justify-center gap-0.5">
                <span className='font-bold text-lg'>Scan Code</span>
                <span className='font-medium text-gray-400 text-xs'>Scan QR Code to checking securely</span>
            </div>
            <div id="qr-reader" className="w-[350px] h-[580px] rounded-[16px] p-0 m-0 overflow-hidden" />
          {/* <p className="mt-4 text-gray-700">Scanned Data: {data}</p> */}
            <button onClick={hidden1} className='flex justify-center items-center rounded-lg text-sm font-medium gap-3 bg-[#1D61E7] text-white w-[350px] h-[48px] shadow-[0px_4px_4px_0px_#00000040] active:shadow-[0px_2px_1px_0px_#00000040] transition-all duration-100 '>Done<img src="/src/assets/check.png" className='h-[15px] invert-100' alt="" /></button>
        </div>
        // </motion.div>
    );
}

export default Qrcode
