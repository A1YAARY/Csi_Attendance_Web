import React from 'react'
import { useNavigate } from 'react-router-dom';

const Navbar = () => { //props
    const navigate = useNavigate();
    const showlogout = () => {
        navigate('/ShowLogOut')
    }
    return (
    <div>
        <div className="navbar absolute w-screen h-[110px] flex justify-between items-end p-[16px] border-slate-200 border-b-[1px]">
        <img src="/src/assets/logo.png" alt='atharva logo'/>
        <img onClick={showlogout} src="/src/assets/Profile.png" alt="profile" className='h-[27px] w-[27px]'/>
        {/* <div>{props.name}</div> */}
        </div>
    </div>
    )
}

export default Navbar
