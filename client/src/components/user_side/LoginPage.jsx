import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import "react-toastify/dist/ReactToastify.css";
import Magnet from "../../reactbitscomponents/Magnet";
import {AiOutlineEye, AiOutlineEyeInvisible} from 'react-icons/ai';

export const LoginPage = () => {
  const navigate = useNavigate();
  const { login, BASE_URL, setorginization } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setshow] = useState(false);
  const [loginadmin, setloginadmin] = useState(true);

  const handleClick = () => {
    setshow(!show)
  }
  const handleAdminLogin = () => {
    setloginadmin(!loginadmin);
  }

  const handleEmailLogin = async (e) => {
    const BASE_URL =
      import.meta.env.VITE_BACKEND_BASE_URL ||
      "https://csi-attendance-web.onrender.com";
    e.preventDefault();
    try {
      const res = await axios.post(
        `${BASE_URL}/auth2/login`,
        { email, password },
        {
          withCredentials: true,
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          timeout: 10000, // Add timeout
        }
      );
      if (res.data.accessToken) {
        localStorage.setItem("orginizationcode", res.data.organization.name);
        login(res.data.user, res.data.accessToken);
        toast.success("Login successful!");
        loginadmin ? navigate("/Teacherinfo") : navigate("/admin");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Login error");
    }
  };

  const handleGoogleLogin = () => {
    // Placeholder for Google login logic
    const login = (userData, accessToken) => {
      setUser(userData);
      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("userData", JSON.stringify(userData));
      console.log(userData);
    };
    navigate("/Teacherinfo");
  };

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
              <h1 className="text-[24px] sm:text-[28px] lg:text-[36px] xl:text-[40px] font-bold tracking-tighter mb-2 lg:mb-6">
                Sign in to your Account
                <p className="text-[14px] sm:text-[16px] lg:text-[18px] text-[#404142] font-semibold tracking-normal mt-1">
                  {loginadmin ? "Staff" : "Admin"} Login
                </p>
              </h1>

              <img
                className="w-full max-w-[280px] sm:max-w-[320px] lg:max-w-[400px] xl:max-w-[450px] h-auto my-6 lg:my-8"
                src="/login.svg"
                alt="Login illustration"
              />
            </div>

            {/* Right side: Form */}
            <div className="px-6 sm:px-8 lg:px-0 pb-8 lg:pb-0 flex flex-col items-center">
              <form
                onSubmit={handleEmailLogin}
                className="flex flex-col gap-4 lg:gap-6"
              >
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="p-3 lg:p-4 rounded-lg border border-gray-300 focus:border-[#1D61E7] focus:outline-none focus:ring-2 focus:ring-[#1D61E7]/20 transition-all text-sm sm:text-base"
                />
                <div className="flex items-center justify-between w-[95%]">
          <input
            type={show ? "text":"password"}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="p-3 rounded-lg border w-[348px]"
          /><p onClick={handleClick}className="ml-[-30px] h-[20px]">{show ? <AiOutlineEyeInvisible></AiOutlineEyeInvisible>:<AiOutlineEye></AiOutlineEye>}</p></div>
                <Magnet padding={90} disabled={false} magnetStrength={90}>
                  <div className="w-full flex gap-3 lg:gap-4">
                    <button
                      type="submit"
                      className="flex justify-center items-center rounded-lg font-medium gap-3 bg-[#1D61E7] hover:bg-[#1a56d1] text-white flex-1 h-[48px] lg:h-[52px] shadow-[0px_4px_4px_0px_#00000040] active:shadow-[0px_2px_1px_0px_#00000040] transition-all duration-200 text-sm sm:text-base"
                    >
                      Login
                    </button>

                    {/* <button
                      type="button"
                      onClick={handleGoogleLogin}
                      className="flex justify-center items-center gap-[10px] border border-[#EFF0F6] hover:border-gray-300 rounded-full w-[48px] lg:w-[52px] h-[48px] lg:h-[52px] shadow-[0px_4px_4px_0px_#00000040] active:shadow-[0px_2px_1px_0px_#00000040] transition-all duration-200"
                    >
                      <img
                        className="h-[20px] w-[22px] sm:h-[24px] sm:w-[26px]"
                        src="/google.png"
                        alt="google"
                      />
                    </button> */}
                  </div>
                </Magnet>
              </form>

              {/* Uncomment if needed */}
              <h3 className="text-[#6C7278] text-[12px] mt-4 text-center lg:text-left flex ">
                Or Login as {loginadmin ?"Admin/Oraganizer" : "Staff"}?{"  "}
                <p className="text-[#4D81E7] hover:underline cursor-pointer" onClick={handleAdminLogin}>
                  Login
                </p>
              </h3>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
