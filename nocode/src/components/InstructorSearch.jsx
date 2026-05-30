import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const InstructorSearch = ({ onSearch }) => {
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e) => {
    e.preventDefault();
    onSearch && onSearch(searchQuery);
  };

  return (
    <form onSubmit={handleSearch} className="mb-6">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#999]" />
        <Input
          type="text"
          placeholder="搜索达人、技能、作品..."
          className="pl-10 pr-20 rounded-full border-[#e8e3db] bg-[#f9f7f3]"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <Button 
          type="submit" 
          className="absolute right-1 top-1/2 transform -translate-y-1/2 bg-[#d4a373] hover:bg-[#c99a67] text-white rounded-full"
        >
          搜索
        </Button>
      </div>
    </form>
  );
};

export default InstructorSearch;
