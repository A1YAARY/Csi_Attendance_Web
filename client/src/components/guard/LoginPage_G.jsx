import React from "react";
import { useNavigate } from "react-router-dom";
import { BrowserRouter } from "react-router-dom";

const LoginPage_G = () => {
    const navigate = useNavigate();
    const hidden = () => {
        navigate("/GenerateQr");
    };
    return (
        <>
            <div className="flex justify-center sm:items-center h-[100dvh] w-screen">
                <div className="absolute inset-0 bg-[url('/src/assets/bg.jpeg')] bg-cover bg-center opacity-50 w-[100vw] hidden sm:block "></div>
                <div className="flex items-center z-10 bg-[#ffffff85] flex-col w-[592px] h-[100dvh] sm:h-[715px] sm:border border-[#BCC1C3]  rounded-3xl">
                    <div className="navbar w-[100%] h-[110px] flex justify-center items-end p-[16px] ">
                        <img src="/src/assets/logo.svg" alt="atharva logo" />
                    </div>
                    <div className="relative h-[100%] w-screen sm:w-max px-[22px] py-[28px] inset-0 flex flex-col text-center justify-between">
                        <h1 className="text-[32px] sm:text-[48px] font-bold tracking-tighter">
                            Attendance Portal
                            <p className="text-[16px] text-[#404142] font-semibold tracking-normal">Guard Login</p>
                        </h1>
                        <img className="h-[304px]" src="src/assets/login.svg" alt="" />
                        <div className="flex flex-col gap-[32px] sm:gap-[16px]">
                            <button
                                onClick={hidden}
                                className="flex justify-center items-center gap-[10px] border border-[#EFF0F6] bg-white rounded-[10px] w-full h-[48px]  shadow-[0px_4px_4px_0px_#00000040] active:shadow-[0px_2px_1px_0px_#00000040] transition-all duration-100
                            ">
                                <div className="flex w-max gap-[10px] h-min">
                                    <img className="h-[18px] w-[18px] my-[2px]" src="src/assets/google.png" alt="google" />
                                    <p className="text-[14px] text-[#1A1C1E] font-semibold">Continue with Google</p>
                                </div>
                            </button>
                            <button
                                onClick={hidden}
                                className="text-center bg-[#1D61E7] rounded-[10px] w-full h-[48px]  shadow-[0px_4px_4px_0px_#00000040] active:shadow-[0px_2px_1px_0px_#00000040] transition-all duration-100 hidden sm:block
                            ">
                                <p className="text-[14px] text-white font-semibold">Sign Up</p>
                            </button>
                            <h3 className="text-[#6C7278] text-[12px] block sm:hidden">
                                Don’t have an account?{" "}
                                <a className="text-[#4D81E7]" href="">
                                    Sign Up
                                </a>
                            </h3>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default LoginPage_G;
