import React, { useState } from "react";
import "./UnmappedCourses.css";
import Footer from "./footer";
import Navbar from "./Navbar";

interface ClassOption {
  id: string;
  label: string;
  skills: string[];
}

const availableClasses: ClassOption[] = [
  { id: "2", label: "SER 340", skills: [] },
  { id: "3", label: "SER 341", skills: [] },
  { id: "4", label: "SER 325", skills: [] },
  { id: "5", label: "SER 350", skills: [] },
  { id: "6", label: "SER 330", skills: [] },
  { id: "7", label: "SER 210", skills: [] },
  { id: "8", label: "SER 492", skills: [] },
  { id: "9", label: "SER 225", skills: [] },
  { id: "10", label: "SER 375", skills: [] },
  { id: "11", label: "SER 120", skills: [] },
  { id: "12", label: "SER 305", skills: [] },
]

const UnmappedCourses: React.FC = () => {
    const filteredclasses = availableClasses.filter((c) => (c.skills.length == 0))
    /* ---------- Render ---------------------------------------------------- */
    return (
        <div className="dashboard-page">
            <Navbar />
            {/* main content */}
            <main className="dashboard-main">
                <div className="rectangle">
                    <h1>Select an unmapped course you are teaching:</h1>
                    <div className="listItems">
                        {filteredclasses.map((c) => (
                            <button className="courseButton">{c.label}</button>
                        ))}
                    </div>
                </div>
            </main>
            
            {/* Footer */}
            <Footer />
        </div>
    );
};

export default UnmappedCourses;
