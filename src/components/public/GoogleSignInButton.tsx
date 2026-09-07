import {memo} from "react";
import GoogleIcon from "@/components/public/GoogleIcon";

function GoogleSignInButton({
    text = 'Continue with Google',
    onClick,
    disabled = false,
    className = "",
    textClassName = "",
    iconClassName = "",
}: {
    text?: string,
    onClick: () => void,
    disabled?: boolean,
    className?: string,
    textClassName?: string,
    iconClassName?: string,
}) {
    return (
        <button 
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={`relative w-full h-11 px-4 flex items-center justify-center bg-[#F2F2F2] hover:bg-[#E3E3E3] rounded-xl transition-all shadow-sm active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
        >
            <GoogleIcon
                className={`absolute left-4 w-5 h-5 shrink-0 ${iconClassName}`}
            />
            <span 
                className={`text-[#1F1F1F] font-medium text-sm tracking-tight ${textClassName}`}
            >
                {text}
            </span>
        </button>
    )
}

export default memo(GoogleSignInButton);