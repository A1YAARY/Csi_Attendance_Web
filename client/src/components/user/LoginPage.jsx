import React from "react";
import Navbar from "./Navbar";
import { useNavigate } from "react-router-dom";
import { BrowserRouter } from 'react-router-dom';

export const LoginPage = () => {
    const navigate = useNavigate();
    const hidden = () => {
        navigate('/Teacherinfo')
    }
    return (
        <div className="flex flex-col w-full h-[100dvh]">
            <div className="navbar w-screen h-[110px] flex justify-center items-end p-[16px] ">
                <img src="/src/assets/logo.svg" alt="atharva logo" />
            </div>
            <div className="relative h-[100%] w-full px-[22px] py-[28px] inset-0 flex flex-col text-center justify-between">
                <h1 className="text-[32px] font-bold tracking-tighter">
                    Sign in to your Account
                    <p className="text-[16px] text-[#404142] font-semibold tracking-normal">Staff Login</p>
                </h1>
                <img className="h-[304px]" src="src/assets/login.svg" alt="" />
                <div className="flex flex-col gap-[32px]">
                    <button
                        className="flex justify-center items-center gap-[10px] border border-[#EFF0F6] rounded-[10px] w-full h-[48px]  shadow-[0px_4px_4px_0px_#00000040] active:shadow-[0px_2px_1px_0px_#00000040] transition-all duration-100;
                    ">
                        <div onClick={hidden} className="flex w-max gap-[10px] h-min">
                            <img className="h-[18px] w-[18px] my-[2px]" src="src/assets/google.png" alt="google" />
                            <p className="text-[14px] text-[#1A1C1E] font-semibold">Continue with Google</p>
                        </div>
                    </button>
                    <h3 className="text-[#6C7278] text-[12px]">
                        Don’t have an account?{" "}
                        <a className="text-[#4D81E7]" href="">
                            Sign Up
                        </a>
                    </h3>
                </div>
            </div>
        </div>
    );
};
