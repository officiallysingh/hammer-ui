const Header = () => {
    return (
        < header className="h-14 md:h-16 bg-white border-b flex items-center px-4 md:px-8 shadow-sm fixed top-0 left-0 right-0 z-50" >
            <div className="flex items-center justify-between w-full">
                <div className="text-lg font-semibold">Auction App</div>
                <nav className="hidden md:flex gap-6 text-sm text-gray-600">
                    <a href="#" className="hover:text-black">Home</a>
                    <a href="#" className="hover:text-black">Auctions</a>
                    <a href="#" className="hover:text-black">Profile</a>
                </nav>
            </div>
        </header >
    )
}

export default Header