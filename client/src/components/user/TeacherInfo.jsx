import React from 'react'
// import { motion } from 'framer-motion'
import Navbar from './Navbar'
import { Link, useNavigate } from 'react-router-dom'
import { div } from 'framer-motion/client'

const TeacherInfo = () => {
    const navigate = useNavigate();
    const hidden = () => {
        navigate('/ScanQR')
    }
    return (
    // <motion.div
    //     initial = {{ opacity:1 ,x:100}}
    //     animate = {{ opacity:1 ,x:0}}
    //     exit={{opacity:0 , x:-100}}
    //     transition = {{duration:0.2}}
    // >
    <div>
        <Navbar />
        <div className="teacher-info">
            <div className="avatar flex flex-col justify-center items-center h-[600px]">
                <img src="/src/assets/Avatar.png" alt="avatar" className='h-[182px] w-[182px]'/>
                <span className='font-medium text-[24px]'>John Adams</span>
                <span className='text-gray-600 text-[16px]'>Teacher, EXTC dept.</span>
            </div>
            <div className="qr flex flex-col justify-center items-center gap-[8px]">
                <span className='text-xs text-gray-600'>Scan QR to mark attendance</span>
                <button onClick={hidden} className='flex justify-center items-center rounded-lg text-sm font-medium gap-3 bg-[#1D61E7] text-white w-[350px] h-[48px] shadow-[0px_4px_4px_0px_#00000040] active:shadow-[0px_2px_1px_0px_#00000040] transition-all duration-100 
'> Scan QR <img src="/src/assets/Vector.png" className='h-[20px]' alt="" /></button>
                <button className='flex justify-center items-center rounded-lg text-sm font-medium border-[1px] border-slate-200 w-[350px] h-[48px]'>View Previous Attendance</button>
            </div>
        </div>
    </div>
    // </motion.div>
    )
}

export default TeacherInfo
