export function convertToMinutes(timeString) {
    if(!timeString){
        return 1
    }
    const [hours, minutes, seconds] = timeString.split(":").map(Number);
    return hours * 60 + minutes + Math.floor(seconds / 60);
}