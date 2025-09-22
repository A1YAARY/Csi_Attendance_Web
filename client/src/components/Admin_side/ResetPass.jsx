

import React, { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Magnet from "../../reactbitscomponents/Magnet";

export const ResetPass = () => {
    const navigate = useNavigate();
    const [password, setPassword] = useState("");
    const [newPass, setnewPass] = useState("")
    return (
        <div className="flex flex-col min-h-screen w-full">
            <ToastContainer />

            {/* Navbar - responsive height and padding */}
            <div className="navbar w-full h-[80px] sm:h-[100px] lg:h-[110px] flex justify-center items-end p-4 lg:p-[16px]">
                <img
                    src="/logo.svg"
                    alt="atharva logo"
                    className="h-auto max-h-[50px] sm:max-h-[60px] lg:max-h-[70px]"
                />
            </div>

            {/* Main content container */}
            <div className="flex-1 flex items-center justify-center">
                <div className="w-full max-w-md lg:max-w-6xl mx-auto">
                    {/* Desktop layout: side by side, Mobile: stacked */}
                    <div className="lg:grid lg:grid-cols-2 lg:gap-12 lg:items-center">
                        {/* Left side: Title and Image */}
                        <div className="flex flex-col items-center text-center px-6 sm:px-8 lg:px-0">
                            <h1 className="text-[24px] sm:text-[28px] lg:text-[36px] xl:text-[40px] font-bold mb-2 lg:mb-6">
                                Reset Password
                            </h1>

                            <img
                                className="w-full max-w-[280px] sm:max-w-[320px] lg:max-w-[400px] xl:max-w-[450px] h-auto my-6 lg:my-8"
                                src="/login.svg"
                                alt="Login illustration"
                            />
                        </div>

                        {/* Right side: Form */}
                        <div className="px-6 sm:px-8 lg:px-0 pb-8 lg:pb-0">
                            <form
                                // onSubmit={handleEmailLogin}
                                className="flex flex-col gap-4 lg:gap-6"
                            >
                                <input
                                    type="password"
                                    placeholder="New Password"
                                    value={newPass}
                                    onChange={(e) => setnewPass(e.target.value)}
                                    required
                                    className="p-3 lg:p-4 rounded-lg border border-gray-300 focus:border-[#1D61E7] focus:outline-none focus:ring-2 focus:ring-[#1D61E7]/20 transition-all text-sm sm:text-base"
                                />
                                <input
                                    type="password"
                                    placeholder="Confirm Password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="p-3 lg:p-4 rounded-lg border border-gray-300 focus:border-[#1D61E7] focus:outline-none focus:ring-2 focus:ring-[#1D61E7]/20 transition-all text-sm sm:text-base"
                                />
                                <Magnet padding={90} disabled={false} magnetStrength={90}>
                                    <div className="w-full flex gap-3 lg:gap-4">
                                        <button
                                            onClick={(e) => {
                                                e.preventDefault(); // prevent default form submission if inside a form

                                                // Assume password and newPass come from component state or props
                                                if (password === newPass && password != "") {
                                                    toast.success("Password changed successfully!");
                                                    setPassword(newPass);  // set the password if they match
                                                    // <Navigate to="/login" />
                                                    navigate('/')
                                                } else {
                                                    toast.error("Password does not match");  // show error popup if they don't
                                                }
                                            }}
                                            type="submit"
                                            className="flex justify-center items-center rounded-lg font-medium gap-3 bg-[#1D61E7] hover:bg-[#1a56d1] text-white flex-1 h-[48px] lg:h-[52px] shadow-[0px_4px_4px_0px_#00000040] active:shadow-[0px_2px_1px_0px_#00000040] transition-all duration-200 text-sm sm:text-base"
                                        >
                                            Confirm                                            
                                        </button>
                                    </div>
                                </Magnet>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ResetPass;

