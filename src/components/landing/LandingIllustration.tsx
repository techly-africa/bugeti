"use client";

import React from "react";

export function IllustrationBudget() {
  return (
    <div className="relative w-full h-full flex items-center justify-center group">
      <div className="absolute inset-0 bg-green-100/50 rounded-full scale-0 group-hover:scale-100 transition-transform duration-700 blur-2xl" />
      <svg
        viewBox="0 0 200 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full relative z-10 drop-shadow-xl"
      >
        <rect x="55" y="8" width="90" height="144" rx="14" fill="#0D5C36" />
        <rect x="60" y="16" width="80" height="128" rx="10" fill="#fff" />
        
        {/* Header */}
        <rect x="60" y="16" width="80" height="22" rx="10" fill="#ECFDF5" />
        <text x="100" y="31" fontSize="7" fill="#0D5C36" fontWeight="700" textAnchor="middle">March 2026</text>
        
        {/* Progress Bars */}
        {[
          { color: "#16a34a", top: 44, label: "Market", val: "80%" },
          { color: "#ca8a04", top: 64, label: "School", val: "40%" },
          { color: "#0D5C36", top: 84, label: "Rent",   val: "100%" },
          { color: "#22c55e", top: 104, label: "Momo",  val: "65%" },
        ].map((item, i) => (
          <g key={i}>
            <text x="68" y={item.top + 5} fontSize="5" fill="#6B7280">{item.label}</text>
            <rect x="68" y={item.top + 8} width="64" height="4" rx="2" fill="#F3F4F6" />
            <rect 
              x="68" y={item.top + 8} 
              width="0" 
              height="4" 
              rx="2" 
              fill={item.color}
              className="animate-[grow-right_1.5s_ease-out_forwards]"
              style={{ animationDelay: `${0.2 + i * 0.1}s`, width: `${parseInt(item.val) * 0.64}%` }}
            />
          </g>
        ))}

        {/* Floating elements */}
        <circle cx="165" cy="40" r="12" fill="#FFD95A" className="animate-bounce" style={{ animationDuration: "3s" }} />
        <text x="165" y="44" fontSize="10" textAnchor="middle" fill="#92400E" fontWeight="900">R</text>
        
        <path d="M40 120 L50 110 L60 115" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" className="animate-pulse" />
      </svg>
    </div>
  );
}

export function IllustrationFamily() {
  return (
    <div className="relative w-full h-full flex items-center justify-center group">
       <div className="absolute inset-0 bg-yellow-100/50 rounded-full scale-0 group-hover:scale-100 transition-transform duration-700 blur-2xl" />
       <svg viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full relative z-10 drop-shadow-lg">
          <circle cx="80" cy="80" r="45" fill="#D1FAE5" className="animate-[pulse_4s_infinite]" />
          <circle cx="120" cy="80" r="45" fill="#FEF9C3" className="animate-[pulse_4s_infinite_1s]" />
          
          <g className="animate-[float_5s_infinite_ease-in-out]">
            {/* House icon */}
            <path d="M85 85 L100 70 L115 85 V100 H85 V85Z" fill="#0D5C36" />
            <path d="M92 100 V90 H108 V100" fill="#fff" />
          </g>
          
          {/* People icons */}
          <circle cx="65" cy="70" r="12" fill="#0D5C36" />
          <path d="M50 100 Q65 85 80 100" fill="#0D5C36" />
          
          <circle cx="135" cy="70" r="12" fill="#CA8A04" />
          <path d="M120 100 Q135 85 150 100" fill="#CA8A04" />
          
          <text x="100" y="145" fontSize="8" fill="#0D5C36" fontWeight="800" textAnchor="middle">SHARED BUDGETS</text>
       </svg>
    </div>
  );
}

export function IllustrationMomo() {
  return (
    <div className="relative w-full h-full flex items-center justify-center group">
      <div className="absolute inset-0 bg-blue-100/50 rounded-full scale-0 group-hover:scale-100 transition-transform duration-700 blur-2xl" />
      <svg viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full relative z-10 drop-shadow-xl">
        <rect x="65" y="20" width="70" height="120" rx="12" fill="#1C1C1E" />
        <rect x="70" y="28" width="60" height="104" rx="8" fill="#111827" />
        <rect x="70" y="28" width="60" height="30" rx="8" fill="#FFD95A" />
        
        <text x="100" y="47" fontSize="7" fill="#92400E" textAnchor="middle" fontWeight="900">MOMO</text>
        
        {[80, 100, 120].map((y, i) => (
          <g key={i}>
             <circle cx="82" cy={y} r="6" fill="#1F2937" />
             <rect x="92" y={y-3} width="30" height="6" rx="2" fill="#374151" />
             {i === 1 && (
               <path d="M122 100 L128 100" stroke="#16a34a" strokeWidth="2" className="animate-ping" />
             )}
          </g>
        ))}
        
        <circle cx="150" cy="80" r="15" fill="#ECFDF5" stroke="#10B981" strokeWidth="2" className="animate-bounce" />
        <text x="150" y="84" fontSize="10" textAnchor="middle">✅</text>
      </svg>
    </div>
  );
}

export function IllustrationIkimina() {
  return (
    <div className="relative w-full h-full flex items-center justify-center group">
      <div className="absolute inset-0 bg-emerald-100/50 rounded-full scale-0 group-hover:scale-100 transition-transform duration-700 blur-2xl" />
      <svg viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full relative z-10 drop-shadow-lg">
        <circle cx="100" cy="80" r="50" stroke="#E5E7EB" strokeWidth="1" strokeDasharray="4 4" />
        
        {[0, 60, 120, 180, 240, 300].map((angle, i) => {
          const rad = (angle * Math.PI) / 180;
          const x = 100 + Math.cos(rad) * 50;
          const y = 80 + Math.sin(rad) * 50;
          return (
            <g key={i} className={`animate-[spin-slow_10s_infinite_linear] origin-center`} style={{ animationDelay: `${i * -1.5}s` }}>
              <circle cx={x} cy={y} r="10" fill={i % 2 === 0 ? "#0D5C36" : "#CA8A04"} />
              <text x={x} y={y+3} fontSize="8" textAnchor="middle">👤</text>
            </g>
          );
        })}
        
        <circle cx="100" cy="80" r="25" fill="#FFD95A" className="animate-pulse" />
        <text x="100" y="84" fontSize="12" textAnchor="middle">💰</text>
      </svg>
    </div>
  );
}
