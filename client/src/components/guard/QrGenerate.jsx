import React from 'react'
import { QRCodeSVG } from 'qrcode.react';

const QrGenerate = () => {
    const qrValue = 'https://www.csiace.com/';
    return (
        <div>
            <div className="w-screen h-screen flex justify-center flex-col items-center gap-[24px]">
                <div className="navbar absolute top-0 w-screen h-[110px] flex justify-center items-end p-[16px] border-slate-200 border-b-[1px]">
                    <div className="navbar absolute top-0 w-screen sm:h-[60px] flex justify-center items-center p-[16px] border-slate-200 sm:border-b-[1px] border-0 h-0">
                        <img className="hidden sm:block" src="/src/assets/logo.png" alt='atharva logo'/>
                    </div>
                    <p className="font-semibold">Generate QR</p>
                </div>
                <div className="box w-[300px] h-[300px] bg-[#F8FAFF] rounded-2xl border-[2px] border-[#3939391a] flex justify-center items-center">
                    <div className="relative w-[200px] h-[200px] flex justify-center items-end">
                    <QRCodeSVG
                        value={qrValue}
                        size={200}
                        fgColor="#000000"
                        bgColor="#ffffff"
                        level="H"
                    />
                    </div>
                    <img
                        src='/src/assets/fa17664f89493e9bfec18e4fe6d4902378b107dc.png'
                        alt="Logo"
                        className="w-[50px] h-[50px] absolute top-[50%] left-[50%] translate-x-[-50%] translate-y-[-110%] rounded-full shadow-lg bg-white p-1"
                    />
                </div>
                <button className='flex justify-center items-center rounded-lg text-sm font-medium gap-3 bg-[#1D61E7] text-white w-[180px] h-[48px] shadow-[0px_4px_4px_0px_#00000040] active:shadow-[0px_2px_1px_0px_#00000040] transition-all duration-100 '><img src="/src/assets/QR Icon.png" className='h-[15px] invert-100' alt="" />Generate QR</button>
            </div>
        </div>
    )
}

export default QrGenerate
