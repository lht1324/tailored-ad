import {memo} from "react";
import Image from "next/image";

function DefaultSignInButton({
    text,
    src,
    onClick,
    disabled = false,
}: {
    text?: string,
    src: string,
    onClick: () => void,
    disabled?: boolean,
}) {
    return (
        <button 
            type="button"
            onClick={onClick}
            disabled={disabled}
            className="relative w-full h-11 px-4 flex items-center justify-center bg-[#F2F2F2] hover:bg-[#E3E3E3] rounded-xl transition-all shadow-sm active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
        >
            <Image
                src={src}
                alt={text ?? "Sign In"}
                width={20}
                height={20}
                className="absolute left-4 w-5 h-5 shrink-0"
            />
            <span 
                className="text-[#1F1F1F] font-medium text-sm tracking-tight"
            >
                {text}
            </span>
        </button>
    )
}

export default memo(DefaultSignInButton);