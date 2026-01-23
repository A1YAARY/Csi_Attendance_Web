import React, { useState, useEffect, useRef } from "react";
import {
    Calendar,
    Download,
    Filter,
    Search,
    Eye,
    Clock,
    MapPin,
} from "lucide-react";
const attendanceRecordsLayout2 = ({ records }) => {
    const [filteredRecords, setFilteredRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [dateFilter, setDateFilter] = useState(() => {
        // Default date filter to today in YYYY-MM-DD
        const today = new Date();
        return today.toISOString().split("T")[0];
    });
    const [statusFilter, setStatusFilter] = useState("all");

    const [open, setOpen] = useState(false);
    const menuRef = useRef(null);
    useEffect(() => {
        console.log("attendanceRecordsLayout2 records:", records);

    }, [records])
    const toggleDropdown = () => {
        setOpen(!open);
    };
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    return (
        <div>attendanceRecordsLayout2</div>
    )
}

export default attendanceRecordsLayout2