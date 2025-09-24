import React from 'react'
import { Link, useNavigate } from 'react-router-dom'

const Logout = () => {
    const navigate = useNavigate();
    const hidden = () => {
        navigate('/')
    }
    return (
    <div>
        <div className="teacher-info">
            <div className="avatar flex flex-col justify-center items-center h-[600px]">
                <img src="/src/assets/Avatar.png" alt="avatar" className='h-[182px] w-[182px]'/>
                <span className='font-medium text-[24px]'>John Adams</span>
                <span className='text-gray-600 text-[16px]'>Teacher, EXTC dept.</span>
            </div>
            <div className="qr flex flex-col justify-center items-center gap-[8px]">
                <button onClick={hidden} className='flex justify-center items-center rounded-lg text-sm font-normal gap-3 bg-[#1D61E7] text-white w-[350px] h-[48px] shadow-[0px_4px_4px_0px_#00000040] '> Log Out </button>
            </div>
        </div>
    </div>
    )
}

export default Logout