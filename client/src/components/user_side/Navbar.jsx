import React from "react";
import { Link, useNavigate } from "react-router-dom";

const Navbar = () => {
  //props
  const navigate = useNavigate();
  const showlogout = () => {
    navigate("/ShowLogOut");
  };
  return (
    <div>
      <div className="navbar w-screen h-[110px] flex justify-between items-end p-[16px] border-slate-200 border-b-[1px]">
        <img src="/logo.png" alt="atharva logo" />
        {/* <Link to={"/admin"}>
          <button className="p-[0.4rem] bg-red-600">ADMIN</button>
        </Link> */}
        <img
          onClick={showlogout}
          src="/Profile.png"
          alt="profile"
          className="h-[27px] w-[27px]"
        />
        {/* <div>{props.name}</div> */}
      </div>
    </div>
  );
};

export default Navbar;
